"use client";

import { useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "viem";
import { useReadContracts, useWriteContract, usePublicClient } from "wagmi";
import { useTxSender, type ContractWrite } from "./sponsored";
import { usePiggy } from "./usePiggy";
import { useSim, deployedTotalWei, accruedWei } from "./sim";
import { optionSummary } from "./planner";
import { api, API_MODE, runOp } from "./api";
import { USDC_ADDRESS, FACTORY_ADDRESS } from "./chain";
import {
  CHAIN_MODE,
  POSITIONS,
  AAVE_ADDRESS,
  VAULT_ADDRESS,
  factoryAbi,
  accountAbi,
  aaveAbi,
  vaultAbi,
  buildEarnPlan,
  buildClosePlan,
} from "./contracts";
import type { ActivityEntry, RiskTolerance } from "./types";

const ZERO_SALT = ("0x" + "0".repeat(64)) as `0x${string}`;

const DEMO_SPEED = 8000; // match backend mock + client sim so the live tick lines up

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
  harvest: () => Promise<{ netBase: bigint; feeBase: bigint }>;
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
    return { netBase: r.net, feeBase: r.fee };
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
// API source — active when NEXT_PUBLIC_API_URL is set (talks to the backend).
// ---------------------------------------------------------------------------
function useApiView(): PiggyView {
  const { authenticated, getAccessToken } = usePrivy();
  const qc = useQueryClient();

  const sessionQ = useQuery({
    queryKey: ["session"],
    enabled: authenticated,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const token = await getAccessToken();
      return api.verify(token ?? "");
    },
  });
  const hasSession = Boolean(sessionQ.data);

  const portfolioQ = useQuery({
    queryKey: ["portfolio"],
    enabled: hasSession,
    refetchInterval: 5_000,
    queryFn: api.portfolio,
  });
  const activityQ = useQuery({
    queryKey: ["activity"],
    enabled: hasSession,
    refetchInterval: 5_000,
    queryFn: api.activity,
  });

  const p = portfolioQ.data;
  const deployed = p ? BigInt(p.principal.base) : 0n;
  const resting = p ? BigInt(p.resting.base) : 0n;
  const totalUsd = p ? Number(p.total.base) / 1e6 : 0;
  const apyBps = p?.apyBps ?? 0;
  const fetchedAt = portfolioQ.dataUpdatedAt; // 0 before first fetch (then deployed=0 → rate=0)
  const ratePerMs = (Number(deployed) * (apyBps / 10000) * DEMO_SPEED) / (365 * 24 * 60 * 60 * 1000) / 1e6;

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
  }, [qc]);

  return {
    ready: portfolioQ.isSuccess,
    piggyAddress: sessionQ.data?.user.piggy as `0x${string}` | undefined,
    restingBase: resting,
    withdrawableBase: resting,
    deployedBase: deployed,
    positions: (p?.positions ?? []).map((s) => ({
      key: s.key,
      name: s.name,
      base: BigInt(s.base),
      apyBps: s.apyBps,
    })),
    apyBps,
    activity: (activityQ.data?.items ?? []).map((a) => ({
      ts: a.ts,
      type: a.type as ActivityEntry["type"],
      summary: a.summary,
      txHash: a.txHash,
    })),
    empty: Boolean(p) && totalUsd === 0,
    earning: deployed > 0n,
    liveTotalUsd: (now) => totalUsd + Math.max(0, ratePerMs * (now - fetchedAt)),
    liveAccruedUsd: (now) =>
      (p ? Number(p.accrued.base) / 1e6 : 0) + Math.max(0, ratePerMs * (now - fetchedAt)),
    bumpValueUsd: totalUsd,
    earn: async (amountBase, risk) => {
      await runOp(api.buildEarn(amountBase.toString(), STRATEGY_ID[risk]));
      refresh();
    },
    harvest: async () => {
      const op = await api.buildHarvest();
      await api.submit(op.operationId, "0x");
      refresh();
      const pv = op.preview as { netBase?: string; feeBase?: string };
      return { netBase: BigInt(pv.netBase ?? "0"), feeBase: BigInt(pv.feeBase ?? "0") };
    },
    closePosition: async (amountBase) => {
      await runOp(api.buildExit(amountBase.toString()));
      refresh();
    },
    addFiat: async (amountUsd) => {
      await api.onramp(amountUsd.toFixed(2));
      refresh();
    },
    withdraw: async (to, amountBase) => {
      const r = await runOp(api.buildWithdraw(to, amountBase.toString()));
      refresh();
      return { txHash: r.txHash };
    },
    reset: () => {},
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

  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const owner = embedded?.address as `0x${string}` | undefined;

  const positionsRead = useReadContracts({
    query: { enabled: Boolean(piggyAddress), refetchInterval: 8_000 },
    contracts: piggyAddress
      ? [
          { address: AAVE_ADDRESS, abi: aaveAbi, functionName: "supplied", args: [piggyAddress, USDC_ADDRESS as `0x${string}`] },
          { address: VAULT_ADDRESS, abi: vaultAbi, functionName: "maxWithdraw", args: [piggyAddress] },
        ]
      : [],
  });
  const aaveBase = (positionsRead.data?.[0]?.result as bigint | undefined) ?? 0n;
  const vaultBase = (positionsRead.data?.[1]?.result as bigint | undefined) ?? 0n;

  const idle = balance; // USDC sitting in the account
  const deployed = aaveBase + vaultBase;
  const total = idle + deployed;
  const positions = (
    [
      { key: "aave", base: aaveBase },
      { key: "vault", base: vaultBase },
    ] as const
  )
    .filter((p) => p.base > 0n)
    .map((p) => ({ key: p.key, name: POSITIONS[p.key].name, base: p.base, apyBps: POSITIONS[p.key].apyBps }));
  const apyBps =
    deployed > 0n ? Math.round(Number(aaveBase * 280n + vaultBase * 410n) / Number(deployed)) : 0;

  const refresh = useCallback(() => {
    qc.invalidateQueries(); // re-reads balance + positions
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
    activity: [], // TODO: read from account events
    empty: total === 0n,
    earning: deployed > 0n,
    liveTotalUsd: () => Number(total) / 1e6, // mocks don't accrue — flat
    liveAccruedUsd: () => 0,
    bumpValueUsd: Number(total) / 1e6,
    earn: async (amountBase, risk) => {
      if (!piggyAddress) return;
      const plan = buildEarnPlan(optionSummary(risk).slices, amountBase);
      // First-ever earn: create the piggy + deposit in ONE signature. After that, just deposit.
      const calls: ContractWrite[] = [];
      if (await needsCreate()) {
        calls.push({ address: FACTORY_ADDRESS!, abi: factoryAbi, functionName: "createAccount", args: [ZERO_SALT] });
      }
      calls.push({ address: piggyAddress, abi: accountAbi, functionName: "executePlan", args: [plan] });
      await sendBatch(calls);
      refresh();
    },
    harvest: async () => ({ netBase: 0n, feeBase: 0n }), // no yield on mock venues
    closePosition: async (amountBase) => {
      if (!piggyAddress) return;
      const plan = buildClosePlan(
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

/** The one hook the UI uses. Bound at module load — no conditional hooks.
 *  Chain (real on-chain) when the factory is set; else backend; else the client sim. */
export const usePiggyView: () => PiggyView = CHAIN_MODE
  ? useChainView
  : API_MODE
    ? useApiView
    : useSimView;
