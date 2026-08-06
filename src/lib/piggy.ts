"use client";

import { useCallback, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createPublicClient, createWalletClient, http, parseAbi, erc20Abi, zeroAddress, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { useReadContract, useReadContracts, useWriteContract, usePublicClient } from "wagmi";
import { useTxSender, type ContractWrite } from "./sponsored";
import { usePiggy } from "./usePiggy";
import { useSim, deployedTotalWei, accruedWei } from "./sim";
import { optionSummary } from "./planner";
import { api, API_MODE } from "./api";
import { ADAPTER_AAVE, ADAPTER_ERC4626, type RegistryVenue, type HeldPosition } from "./plan";

// wagmi infers a fixed TUPLE from a literal `contracts` array, which a dynamic-length multicall cannot
// satisfy. This is the loose shape the runtime actually needs; only compile-time tuple inference is lost.
type MulticallContracts = readonly {
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  address?: `0x${string}`;
  chainId?: number;
}[];
import { USDC_ADDRESS, FACTORY_ADDRESS, OPS_URL, activeChain } from "./chain";
import {
  CHAIN_MODE,
  POSITIONS,
  AAVE_ADDRESS,
  VAULT_ADDRESS,
  factoryAbi,
  accountAbi,
  aaveAbi,
  vaultAbi,
  registryAbi,
  venueBalanceAbi,
  chainlinkAbi,
  buildEarnPlan,
  buildEnginePlan,
  buildClosePlan,
  buildBaseEarnPlan,
  buildBaseClosePlan,
  aavePositionId,
  cryptoVenues,
} from "./contracts";
import type { ActivityEntry, RiskTolerance } from "./types";

const ZERO_SALT = ("0x" + "0".repeat(64)) as `0x${string}`;

/** RiskTolerance (UI) → strategy id (API / market). */
export const STRATEGY_ID: Record<RiskTolerance, string> = {
  khong: "safe",
  "mot-chut": "balanced",
  "thoai-mai": "growth",
};

export interface Position {
  key: string;
  name: string;
  base: bigint;
  apyBps: number;
  cls?: "savings" | "crypto"; // set when the source knows (ops breakdown); else inferred by key
}

/** One normalized shape the UI consumes, whether data comes from the sim or the backend. */
export interface PiggyView {
  ready: boolean;
  piggyAddress?: `0x${string}`;

  restingBase: bigint; // in wallet
  withdrawableBase: bigint; // rút thật được ngay
  deployedBase: bigint; // vốn đang earn (principal)
  positions: Position[];
  apyBps: number;
  activity: ActivityEntry[];
  empty: boolean;
  earning: boolean;

  liveTotalUsd: (now: number) => number; // hero, có tick lãi cục bộ
  liveAccruedUsd: (now: number) => number; // lãi đang chạy (positions tab)
  bumpValueUsd: number; // heo nảy khi tăng

  earn: (amountBase: bigint, risk: RiskTolerance) => Promise<void>;
  harvest: () => Promise<{ netBase: bigint }>;
  closePosition: (amountBase: bigint) => Promise<void>;
  addFiat: (amountUsd: number) => Promise<void>;
  withdraw: (to: `0x${string}`, amountBase: bigint) => Promise<{ txHash?: string }>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// SIM source (Phase 0, client-side) — the default when no NEXT_PUBLIC_API_URL.
// ---------------------------------------------------------------------------
function useSimView(): PiggyView {
  const { piggyAddress, balance } = usePiggy();
  const sim = useSim();
  const { writeContractAsync } = useWriteContract();

  const deployed = deployedTotalWei(sim.positions);
  const spendable = balance + BigInt(sim.harvestedWei) + BigInt(sim.sandboxWei);
  const resting = spendable > deployed ? spendable - deployed : 0n;
  const withdrawable = resting < balance ? resting : balance;
  const harvestedUsd = Number(BigInt(sim.harvestedWei)) / 1e6;
  const sandboxUsd = Number(BigInt(sim.sandboxWei)) / 1e6;
  const realUsd = Number(balance) / 1e6;

  const apyBps =
    deployed > 0n
      ? Math.round(
          sim.positions.reduce((a, p) => a + (p.apy ?? 0) * Number(BigInt(p.amountWei)), 0) /
            Number(deployed) *
            100,
        )
      : 0;

  const earn = useCallback(
    async (amountBase: bigint, risk: RiskTolerance) => {
      const slices = optionSummary(risk).slices;
      sim.earnMore(
        slices.map((s) => ({
          key: s.key,
          name: s.name,
          amountWei: ((amountBase * BigInt(s.percent)) / 100n).toString(),
          apy: s.apy,
        })),
        "Put money to work",
      );
    },
    [sim],
  );

  const harvest = useCallback(async () => {
    const r = sim.harvest();
    return { netBase: r.net };
  }, [sim]);

  const closePosition = useCallback(async (amountBase: bigint) => sim.exitToWallet(amountBase), [sim]);
  const addFiat = useCallback(
    async (amountUsd: number) => sim.devDeposit(BigInt(Math.round(amountUsd * 1e6))),
    [sim],
  );

  const withdraw = useCallback(
    async (to: `0x${string}`, amountBase: bigint) => {
      if (!USDC_ADDRESS) throw new Error("No USDC on this chain");
      const txHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, amountBase],
      });
      sim.addActivity({
        ts: Date.now(),
        type: "withdraw",
        summary: `Withdrew $${(Number(amountBase) / 1e6).toFixed(2)} to ${to.slice(0, 6)}…`,
        txHash,
      });
      return { txHash };
    },
    [sim, writeContractAsync],
  );

  return {
    ready: true,
    piggyAddress,
    restingBase: resting,
    withdrawableBase: withdrawable,
    deployedBase: deployed,
    positions: sim.positions.map((p) => ({
      key: p.key,
      name: p.name,
      base: BigInt(p.amountWei),
      apyBps: Math.round((p.apy ?? 0) * 100),
    })),
    apyBps,
    activity: sim.activity,
    empty:
      balance === 0n &&
      sim.positions.length === 0 &&
      sim.sandboxWei === "0" &&
      sim.harvestedWei === "0",
    earning: deployed > 0n,
    liveTotalUsd: (now) =>
      realUsd + harvestedUsd + sandboxUsd + Number(accruedWei(sim.positions, sim.earnSince, now)) / 1e6,
    liveAccruedUsd: (now) => Number(accruedWei(sim.positions, sim.earnSince, now)) / 1e6,
    bumpValueUsd: Number(spendable) / 1e6,
    earn,
    harvest,
    closePosition,
    addFiat,
    withdraw,
    reset: sim.reset,
  };
}

// ---------------------------------------------------------------------------
// CHAIN source — real on-chain (Sepolia contracts). Active when the factory is set.
// Money moves client ↔ contracts: user builds Action[] + signs executePlan.
// ---------------------------------------------------------------------------
function useChainView(): PiggyView {
  const { piggyAddress, balance } = usePiggy(); // account addr (predict) + idle USDC
  const { wallets } = useWallets();
  const { send, sendBatch } = useTxSender(); // one door: gasless 7702+paymaster, else self-paid
  const publicClient = usePublicClient();
  const qc = useQueryClient();

  // Balance lock: an earn/close only MOVES money between idle and positions — the total is conserved, so
  // "Your balance" must not budge (only deposit/withdraw/yield may move it). During those actions we pin the
  // displayed total to its pre-action value for a short window, so a mid-refresh read glitch can't dip it.
  const [balanceLock, setBalanceLock] = useState<{ usd: number; until: number } | null>(null);
  const lockBalance = useCallback((usd: number) => {
    setBalanceLock({ usd, until: Date.now() + 9000 });
    setTimeout(() => setBalanceLock(null), 9000);
  }, []);

  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const owner = embedded?.address as `0x${string}` | undefined;

  // On Base the savings pool is the crypto-venue Aave and the crypto slice is a held token (WETH); on
  // Sepolia (no cryptoVenues) it's the legacy Aave + vault. `isBase` = dynamic-router chain (per-quote swap).
  const savingsAave = (cryptoVenues?.aave ?? AAVE_ADDRESS) as `0x${string}`;
  const heldToken = (cryptoVenues?.wsteth ?? (USDC_ADDRESS as `0x${string}`)) as `0x${string}`; // fallback: unused off-Base
  const isBase = Boolean(cryptoVenues && cryptoVenues.router === zeroAddress);
  // The APPROVED venue set, read from the on-chain registry (Base). Hardcoding it here is what let the
  // app drift from what the account will actually accept; reading it means a venue the owner adds via
  // addProtocol shows up with no redeploy, and we never build a deposit that would revert.
  const registryAddr = isBase ? cryptoVenues?.registry : undefined;
  const venueIdsRead = useReadContract({
    address: registryAddr,
    abi: registryAbi,
    functionName: "allPositionIds",
    query: { enabled: Boolean(registryAddr), staleTime: 300_000 },
  });
  const venueIds = useMemo(() => (venueIdsRead.data as readonly `0x${string}`[] | undefined) ?? [], [venueIdsRead.data]);
  const venueRead = useReadContracts({
    query: { enabled: venueIds.length > 0, staleTime: 300_000, placeholderData: keepPreviousData },
    contracts: venueIds.map((id) => ({
      address: registryAddr as `0x${string}`,
      abi: registryAbi,
      functionName: "getProtocol" as const,
      args: [id] as const,
    })),
  });
  /** Approved, ACTIVE venues denominated in our base asset — the only things we may deposit into. */
  const venues: RegistryVenue[] = useMemo(() => {
    const rows = venueRead.data ?? [];
    const out: RegistryVenue[] = [];
    for (const r of rows) {
      const v = r?.result as readonly [number, `0x${string}`, `0x${string}`, `0x${string}`, number] | undefined;
      if (!v) continue;
      const [adapter, target, asset, , status] = v;
      if (status !== 1) continue; // not ACTIVE -> deposits are blocked on-chain
      if (asset.toLowerCase() !== String(USDC_ADDRESS).toLowerCase()) continue;
      if (adapter !== ADAPTER_AAVE && adapter !== ADAPTER_ERC4626) continue;
      out.push({ adapter, target, asset });
    }
    return out;
  }, [venueRead.data]);

  // One read per approved venue: Aave's balance is its aToken (no supplied() view on real Aave V3),
  // an ERC4626 vault's is maxWithdraw (what the account could actually pull out right now).
  const venueContracts = useMemo(
    () =>
      !piggyAddress
        ? []
        : venues.map((v) =>
            v.adapter === ADAPTER_AAVE
              ? { address: (cryptoVenues?.atoken ?? v.target) as `0x${string}`, abi: venueBalanceAbi, functionName: "balanceOf" as const, args: [piggyAddress] as const }
              : { address: v.target, abi: venueBalanceAbi, functionName: "maxWithdraw" as const, args: [piggyAddress] as const },
          ),
    [venues, piggyAddress],
  );

  const positionsRead = useReadContracts({
    // keepPreviousData: if a refetch or a piggyAddress blip would otherwise blank the multicall, keep the
    // last snapshot so idle + positions never desync — prevents the "balance dips then recovers on close".
    query: { enabled: Boolean(piggyAddress), refetchInterval: 8_000, placeholderData: keepPreviousData },
    // On Base the savings legs are DERIVED from the registry venue set, so a balance in any approved vault
    // is visible — previously only the Aave aToken was read, so money deployed anywhere else simply did
    // not appear. Off-Base keeps the original fixed pair (mock venues).
    // Cast: wagmi infers a fixed TUPLE from a literal array, which a dynamic-length multicall can't
    // satisfy. Runtime shape is correct; only the compile-time tuple inference is given up.
    contracts: (piggyAddress
      ? [
          ...(isBase
            ? venueContracts
            : [
                { address: savingsAave, abi: aaveAbi, functionName: "supplied", args: [piggyAddress, USDC_ADDRESS as `0x${string}`] },
                { address: VAULT_ADDRESS, abi: vaultAbi, functionName: "maxWithdraw", args: [piggyAddress] },
              ]),
          { address: heldToken, abi: erc20Abi, functionName: "balanceOf", args: [piggyAddress] },
          // Idle USDC read in the SAME multicall as the positions, so idle + deployed share one atomic
          // snapshot — no flicker when funds move between them (the "$7.5 then $5" glitch on close).
          { address: USDC_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [piggyAddress] },
        ]
      : []) as unknown as MulticallContracts,
  });
  // Base: the first N results are the registry venues, in order. Off-Base: the original [aave, vault] pair.
  const nVenues = isBase ? venueContracts.length : 2;
  const heldPositions: HeldPosition[] = useMemo(
    () =>
      !isBase
        ? []
        : venues.map((v, i) => ({ ...v, base: (positionsRead.data?.[i]?.result as bigint | undefined) ?? 0n })),
    [venues, positionsRead.data, isBase],
  );
  // Savings total across EVERY venue (was: the Aave slot only).
  const savingsBase = isBase
    ? heldPositions.reduce((sum, p) => sum + p.base, 0n)
    : (positionsRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const aaveBase = isBase
    ? heldPositions.find((p) => p.adapter === ADAPTER_AAVE)?.base ?? 0n
    : (positionsRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const vaultBase = isBase ? 0n : (positionsRead.data?.[1]?.result as bigint | undefined) ?? 0n;
  // Held token (Base crypto slice); only consulted when isBase, so the off-Base USDC fallback is ignored.
  const heldBalance = isBase ? (positionsRead.data?.[nVenues]?.result as bigint | undefined) ?? 0n : 0n;

  // Chainlink ETH/USD (Base) to value the WETH slice on-chain — same freshness as the balance reads, so a
  // just-unwound crypto slice never lingers in the total (separate hook: it returns a tuple, not a uint).
  const feedRead = useReadContract({
    address: isBase ? cryptoVenues?.priceFeed : undefined,
    abi: chainlinkAbi,
    functionName: "latestRoundData",
    query: {
      enabled: Boolean(isBase && cryptoVenues?.priceFeed && piggyAddress),
      refetchInterval: 8_000,
      placeholderData: keepPreviousData,
    },
  });
  // heldBalance(1e18) × price(1e8) → µUSD(1e6) = /1e20. Feed answer is the 2nd tuple field.
  const ethPrice8 = (feedRead.data as readonly bigint[] | undefined)?.[1] ?? 0n;
  const heldValue = isBase && ethPrice8 > 0n ? (heldBalance * ethPrice8) / 10n ** 20n : 0n;

  // The DEX-aggregator quote fetcher for on-chain swaps (Base): api.quote → 0x/KyberSwap best fill.
  const fetchQuote = useCallback(
    async (sellToken: `0x${string}`, buyToken: `0x${string}`, sellAmount: bigint) => {
      if (!piggyAddress) throw new Error("No account");
      return api.quote({
        sellToken,
        buyToken,
        sellAmount: sellAmount.toString(),
        taker: piggyAddress,
        chainId: activeChain.id,
      });
    },
    [piggyAddress],
  );

  // Idle USDC — from the positions multicall (atomic with aToken/held), falling back to usePiggy's own
  // read before the multicall first resolves.
  const idle = (positionsRead.data?.[nVenues + 1]?.result as bigint | undefined) ?? balance;

  // Ops indexer (public /account/:addr) when configured: real interest, activity, and the FULL per-venue
  // position breakdown (many Morpho vaults + crypto) — what the 2 hardcoded chain reads can't give.
  const opsQ = useQuery({
    queryKey: ["ops", piggyAddress],
    enabled: Boolean(OPS_URL && piggyAddress),
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await fetch(`${OPS_URL}/account/${piggyAddress}`);
      if (!r.ok) throw new Error("ops unavailable");
      return (await r.json()) as {
        value: number;
        principal: number;
        accrued: number;
        positions: { key: string; name: string; class: "savings" | "crypto"; valueUsd: number }[];
        activity: { kind: string; amount: number; ts: number | null; txHash: string }[];
      };
    },
  });
  const ops = opsQ.data;
  const useOps = Boolean(ops?.positions?.length); // ops knows all venues → prefer it over the 2 chain reads

  // Positions + deployed.
  // On Base: read from CHAIN (aToken savings + WETH×price) so the total shares ONE freshness with `idle`.
  // The ops indexer lags, so summing idle(fresh) + ops-deployed(stale) briefly double-counts a
  // just-unwound slice — that's the "$7.5 then $5 on refresh" glitch. Off-Base: ops breakdown when
  // present, else the two Sepolia mock venues.
  const positions: Position[] = isBase
    ? [
        ...(aaveBase > 0n
          ? [{ key: "aave", name: "Aave lending", base: aaveBase, apyBps: 0, cls: "savings" as const }]
          : []),
        ...(heldValue > 0n
          ? [
              {
                key: (cryptoVenues?.wsteth ?? "").toLowerCase(),
                name: "WETH",
                base: heldValue,
                apyBps: 0,
                cls: "crypto" as const,
              },
            ]
          : []),
      ]
    : useOps
      ? ops!.positions.map((p) => ({
          key: p.key,
          name: p.name,
          base: BigInt(Math.round(p.valueUsd * 1e6)),
          apyBps: 0, // ops has no APY; enriched off-chain / omitted
          cls: p.class,
        }))
      : (
          [
            { key: "aave", base: aaveBase },
            { key: "vault", base: vaultBase },
          ] as const
        )
          .filter((p) => p.base > 0n)
          .map((p) => ({ key: p.key, name: POSITIONS[p.key].name, base: p.base, apyBps: POSITIONS[p.key].apyBps }));

  const deployed = isBase
    ? aaveBase + heldValue
    : useOps
      ? positions.reduce((a, p) => a + p.base, 0n)
      : aaveBase + vaultBase;
  const total = idle + deployed;
  const apyBps =
    isBase || useOps
      ? 0
      : deployed > 0n
        ? Math.round(Number(aaveBase * 280n + vaultBase * 410n) / Number(deployed))
        : 0;

  const opsActivity: ActivityEntry[] = (ops?.activity ?? []).map((a) => ({
    ts: a.ts ?? 0,
    type: a.kind as ActivityEntry["type"],
    summary: `${a.kind === "deposit" ? "Deposited" : a.kind === "withdraw" ? "Withdrew" : a.kind} $${a.amount.toFixed(2)}`,
    txHash: a.txHash,
  }));
  // "Interest earned" comes straight from the ops indexer's own D1-consistent `accrued` (deployed
  // snapshot − principal, both recorded at the same indexed block). NOT recomputed from the chain: the
  // chain's `deployed` is fresher than the indexer's `principal`, so mixing them briefly counts a
  // just-arrived deposit as fake interest (the "$1.9 then $0" spike when earning more).
  const opsAccrued = ops?.accrued ?? 0;

  const refresh = useCallback(() => {
    qc.invalidateQueries(); // re-reads balance + positions + ops
  }, [qc]);

  // Is the piggy already deployed on-chain? First earn bundles createAccount into the same op.
  const needsCreate = useCallback(async () => {
    if (!piggyAddress) return false;
    const code = await publicClient?.getBytecode({ address: piggyAddress });
    return !code || code === "0x";
  }, [piggyAddress, publicClient]);

  return {
    ready: Boolean(piggyAddress),
    piggyAddress,
    restingBase: idle,
    withdrawableBase: idle,
    deployedBase: deployed,
    positions,
    apyBps,
    activity: opsActivity, // real feed from the ops indexer (empty when not configured)
    empty: total === 0n,
    earning: deployed > 0n,
    // Base: `total` is the live chain value (aToken + WETH×price) — already includes gains, so don't add
    // opsAccrued again. Off-Base (mock venues don't accrue): add the ops-reported accrued.
    liveTotalUsd: () => {
      const live = Number(total) / 1e6 + (isBase ? 0 : opsAccrued);
      // Pinned while an internal earn/close settles — total is conserved, so a read glitch can't dip it.
      return balanceLock && Date.now() < balanceLock.until ? balanceLock.usd : live;
    },
    liveAccruedUsd: () => opsAccrued,
    bumpValueUsd: Number(total) / 1e6,
    earn: async (amountBase, risk) => {
      if (!piggyAddress) return;
      lockBalance(Number(total) / 1e6); // internal move (idle → positions) — pin the balance
      // Execute the ENGINE's plan when the backend + an on-chain crypto venue are configured (API mode +
      // a swap router on this chain); otherwise fall back to the client-static USDC plan.
      let plan;
      if (API_MODE && cryptoVenues) {
        const eng = await api.plan({ strategy: STRATEGY_ID[risk], amount: amountBase.toString(), term: "1y" });
        // Base: BUY the crypto slice through the DEX aggregator (real router/minOut). Anvil: mock router.
        plan = isBase
          ? await buildBaseEarnPlan(eng.summary, amountBase, fetchQuote, eng.allocation, venues)
          : buildEnginePlan(eng.summary, amountBase, piggyAddress);
      } else {
        plan = buildEarnPlan(optionSummary(risk).slices, amountBase);
      }
      // First-ever earn: create the piggy + deposit in ONE signature. After that, just deposit.
      const calls: ContractWrite[] = [];
      if (await needsCreate()) {
        calls.push({ address: FACTORY_ADDRESS!, abi: factoryAbi, functionName: "createAccount", args: [ZERO_SALT] });
      }
      calls.push({ address: piggyAddress, abi: accountAbi, functionName: "executePlan", args: [plan] });
      await sendBatch(calls);
      refresh();
    },
    harvest: async () => ({ netBase: 0n }), // no yield on mock venues
    closePosition: async (amountBase) => {
      if (!piggyAddress) return;
      lockBalance(Number(total) / 1e6); // internal move (positions → idle) — pin the balance
      // Base: WITHDRAW savings + SELL the held token back to USDC via the aggregator, split by USD value.
      const plan = isBase
        ? await buildBaseClosePlan(amountBase, heldPositions, heldBalance, fetchQuote)
        : buildClosePlan(
            [
              { key: "aave", base: aaveBase },
              { key: "vault", base: vaultBase },
            ],
            amountBase,
          );
      await send({ address: piggyAddress, abi: accountAbi, functionName: "executePlan", args: [plan] });
      refresh();
    },
    addFiat: async () => {}, // testnet: fund via the crypto address (Circle faucet), not sandbox
    withdraw: async (to, amountBase) => {
      if (!piggyAddress) throw new Error("No account");
      // The account only pays out to its owner; if `to` differs, forward in the SAME op.
      const calls: ContractWrite[] = [
        { address: piggyAddress, abi: accountAbi, functionName: "withdraw", args: [USDC_ADDRESS as `0x${string}`, amountBase] },
      ];
      if (owner && to.toLowerCase() !== owner.toLowerCase()) {
        calls.push({ address: USDC_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: "transfer", args: [to, amountBase] });
      }
      const hash = await sendBatch(calls);
      refresh();
      return { txHash: hash };
    },
    reset: () => {},
  };
}

// ---------------------------------------------------------------------------
// DEV source — anvil + a hardcoded "mock-Privy" wallet (no login). LOCAL DEMO ONLY
// (NEXT_PUBLIC_DEV_WALLET=1). Signs executePlan directly with an anvil account and scales the app's
// 6-dec amounts to the anvil mock USDC's 18 decimals. Never used off localhost.
// ---------------------------------------------------------------------------
export const DEV_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET === "1";
const DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil #0 — PUBLIC test key, LOCAL ONLY
const DEV_SCALE = 10n ** 12n; // app 6-dec → anvil mock USDC 18-dec
const DEV_SALT = ("0x" + "0".repeat(64)) as `0x${string}`;
const mintAbi = parseAbi(["function mint(address to, uint256 amount)"]);

function useDevChainView(): PiggyView {
  const qc = useQueryClient();
  const clients = useMemo(() => {
    const account = privateKeyToAccount(DEV_KEY);
    const rpc = http("http://127.0.0.1:8545");
    return {
      account,
      pub: createPublicClient({ chain: foundry, transport: rpc }),
      wallet: createWalletClient({ account, chain: foundry, transport: rpc }),
    };
  }, []);
  const owner = clients.account.address;

  const q = useQuery({
    queryKey: ["dev-piggy"],
    refetchInterval: 4000,
    queryFn: async () => {
      const piggy = (await clients.pub.readContract({ address: FACTORY_ADDRESS!, abi: factoryAbi, functionName: "predict", args: [owner, DEV_SALT] })) as `0x${string}`;
      const [usdc, supplied, wsteth] = await Promise.all([
        clients.pub.readContract({ address: USDC_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [piggy] }),
        cryptoVenues ? clients.pub.readContract({ address: cryptoVenues.aave, abi: aaveAbi, functionName: "supplied", args: [piggy, USDC_ADDRESS as `0x${string}`] }) : Promise.resolve(0n),
        cryptoVenues ? clients.pub.readContract({ address: cryptoVenues.wsteth, abi: erc20Abi, functionName: "balanceOf", args: [piggy] }) : Promise.resolve(0n),
      ]);
      return { piggy, usdc: usdc as bigint, supplied: supplied as bigint, wsteth: wsteth as bigint };
    },
  });
  const piggy = q.data?.piggy;
  const idle = (q.data?.usdc ?? 0n) / DEV_SCALE; // anvil 18-dec → app 6-dec
  const savingsBase = (q.data?.supplied ?? 0n) / DEV_SCALE;
  const cryptoUsd = ((q.data?.wsteth ?? 0n) * 2500n) / DEV_SCALE; // 1 wstETH = 2500 USDC (mock rate)
  const deployed = savingsBase + cryptoUsd;
  const total = idle + deployed;

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["dev-piggy"] }), [qc]);
  const ensureAccount = useCallback(async () => {
    if (!piggy) return;
    const code = await clients.pub.getCode({ address: piggy });
    if (!code || code === "0x") {
      const hash = await clients.wallet.writeContract({ address: FACTORY_ADDRESS!, abi: factoryAbi, functionName: "createAccount", args: [DEV_SALT] });
      await clients.pub.waitForTransactionReceipt({ hash });
    }
  }, [piggy, clients]);

  return {
    ready: Boolean(q.data),
    piggyAddress: piggy,
    restingBase: idle,
    withdrawableBase: idle,
    deployedBase: deployed,
    positions: [
      ...(savingsBase > 0n ? [{ key: "aave", name: "Aave lending", base: savingsBase, apyBps: 280 }] : []),
      ...(cryptoUsd > 0n ? [{ key: "wsteth", name: "Crypto (wstETH)", base: cryptoUsd, apyBps: 0 }] : []),
    ],
    apyBps: deployed > 0n ? Math.round(Number(savingsBase * 280n) / Number(deployed)) : 0,
    activity: [],
    empty: total === 0n,
    earning: deployed > 0n,
    liveTotalUsd: () => Number(total) / 1e6,
    liveAccruedUsd: () => 0,
    bumpValueUsd: Number(total) / 1e6,
    earn: async (amountBase, risk) => {
      if (!piggy) return;
      await ensureAccount();
      const anvilAmt = amountBase * DEV_SCALE;
      let plan;
      if (API_MODE && cryptoVenues) {
        const eng = await api.plan({ strategy: STRATEGY_ID[risk], amount: anvilAmt.toString(), term: "1y" });
        plan = buildEnginePlan(eng.summary, anvilAmt, piggy);
      } else {
        plan = buildEarnPlan(optionSummary(risk).slices, anvilAmt);
      }
      const hash = await clients.wallet.writeContract({ address: piggy, abi: accountAbi, functionName: "executePlan", args: [plan] });
      await clients.pub.waitForTransactionReceipt({ hash });
      refresh();
    },
    harvest: async () => ({ netBase: 0n }),
    // Unwind `amountBase` USD back to idle USDC, proportionally: WITHDRAW the aave savings + SELL the
    // wstETH crypto slice back to USDC (the sell-back path). All amounts in anvil 18-dec.
    closePosition: async (amountBase) => {
      if (!piggy) return;
      const wsteth = q.data?.wsteth ?? 0n; // anvil 18-dec wstETH balance
      const supplied = q.data?.supplied ?? 0n; // anvil 18-dec USDC supplied to aave
      const plan = buildClosePlan(
        [
          ...(supplied > 0n ? [{ id: aavePositionId(cryptoVenues!.aave), base: supplied }] : []),
          ...(wsteth > 0n && cryptoVenues
            ? [
                {
                  base: wsteth * 2500n, // value in anvil 18-dec USD (mock rate 1 wstETH = 2500 USDC)
                  sell: { token: cryptoVenues.wsteth, tokenBalance: wsteth, router: cryptoVenues.router, account: piggy },
                },
              ]
            : []),
        ],
        amountBase * DEV_SCALE, // app 6-dec USD → anvil 18-dec USD to raise
      );
      if (plan.length === 0) return;
      const hash = await clients.wallet.writeContract({ address: piggy, abi: accountAbi, functionName: "executePlan", args: [plan] });
      await clients.pub.waitForTransactionReceipt({ hash });
      refresh();
    },
    addFiat: async (amountUsd) => {
      if (!piggy) return;
      const anvilAmt = BigInt(Math.round(amountUsd * 1e6)) * DEV_SCALE;
      const hash = await clients.wallet.writeContract({ address: USDC_ADDRESS as `0x${string}`, abi: mintAbi, functionName: "mint", args: [piggy, anvilAmt] });
      await clients.pub.waitForTransactionReceipt({ hash });
      refresh();
    },
    // The account pays out only to its owner (custody invariant); owner = the dev mock wallet (anvil #0).
    // If withdrawing elsewhere, forward from the owner EOA in a second tx (mirrors useChainView).
    withdraw: async (to, amountBase) => {
      if (!piggy) return { txHash: undefined };
      const anvilAmt = amountBase * DEV_SCALE;
      const hash = await clients.wallet.writeContract({ address: piggy, abi: accountAbi, functionName: "withdraw", args: [USDC_ADDRESS as `0x${string}`, anvilAmt] });
      await clients.pub.waitForTransactionReceipt({ hash });
      if (to.toLowerCase() !== owner.toLowerCase()) {
        const t = await clients.wallet.writeContract({ address: USDC_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: "transfer", args: [to, anvilAmt] });
        await clients.pub.waitForTransactionReceipt({ hash: t });
      }
      refresh();
      return { txHash: hash };
    },
    reset: () => {},
  };
}

/** The one hook the UI uses. Bound at module load — no conditional hooks. Dev mock-wallet (anvil,
 *  no login) when NEXT_PUBLIC_DEV_WALLET=1; else chain when the factory is set; else the Phase-0 sim. */
export const usePiggyView: () => PiggyView = DEV_WALLET
  ? useDevChainView
  : CHAIN_MODE
    ? useChainView
    : useSimView;
