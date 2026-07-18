import { encodeAbiParameters, encodeFunctionData, keccak256, parseAbi, zeroAddress } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS, activeChain } from "./chain";

// Deployed on Ethereum Sepolia (contracts/DEPLOYMENTS.md). Mocks over real Circle USDC.
export const REGISTRY_ADDRESS = "0xe7F24D9963d992b2d3b838c615d41E94Ca8F8bd1" as const;
export const AAVE_ADDRESS = "0x5c631226d0467ff2C15065b7173383278A639bb8" as const;
export const VAULT_ADDRESS = "0xc6fA7dc154218b6d7bB81fc19530D16D16778b9E" as const;

/** Chain mode is on when the factory is configured (contracts are live). */
export const CHAIN_MODE = Boolean(FACTORY_ADDRESS);

// AdapterType enum (Types.sol): NONE=0, ERC4626=1, AAVE=2.
const AAVE_KIND = 2;
const ERC4626_KIND = 1;

/** positionId = keccak256(abi.encode(adapterType, target, asset)) — matches ProtocolRegistry. */
function positionId(adapterType: number, target: `0x${string}`): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint8" }, { type: "address" }, { type: "address" }],
      [adapterType, target, USDC_ADDRESS as `0x${string}`],
    ),
  );
}

// The two venues, keyed like the strategy slices (planner.ts).
export const POSITIONS: Record<string, { id: `0x${string}`; apyBps: number; name: string }> = {
  aave: { id: positionId(AAVE_KIND, AAVE_ADDRESS), apyBps: 280, name: "Aave lending" },
  vault: { id: positionId(ERC4626_KIND, VAULT_ADDRESS), apyBps: 410, name: "Stable-yield vault" },
};

/** The Aave WITHDRAW position id for a given pool address (anvil uses a different pool than Sepolia). */
export const aavePositionId = (aave: `0x${string}`): `0x${string}` => positionId(AAVE_KIND, aave);

export const factoryAbi = parseAbi([
  "function predict(address owner_, bytes32 userSalt) view returns (address)",
  "function createAccount(bytes32 userSalt) returns (address)",
]);

export const accountAbi = parseAbi([
  "struct Action { uint8 kind; bytes32 positionId; address assetIn; address assetOut; address router; uint256 amount; uint256 minOut; bytes routeData; }",
  "function owner() view returns (address)",
  "function executePlan(Action[] plan)",
  "function exit(bytes32 positionId, uint256 amount)",
  "function withdraw(address token, uint256 amount)",
]);

export const aaveAbi = parseAbi([
  "function supplied(address user, address asset) view returns (uint256)",
]);

export const vaultAbi = parseAbi([
  "function maxWithdraw(address owner) view returns (uint256)", // = position value in USDC assets
]);

export type PlanAction = {
  kind: number;
  positionId: `0x${string}`;
  assetIn: `0x${string}`;
  assetOut: `0x${string}`;
  router: `0x${string}`;
  amount: bigint;
  minOut: bigint;
  routeData: `0x${string}`;
};

const deposit = (id: `0x${string}`, amount: bigint): PlanAction => ({
  kind: 0, // DEPOSIT
  positionId: id,
  assetIn: zeroAddress,
  assetOut: zeroAddress,
  router: zeroAddress,
  amount,
  minOut: 0n,
  routeData: "0x",
});

const withdrawAction = (id: `0x${string}`, amount: bigint): PlanAction => ({
  kind: 1, // WITHDRAW
  positionId: id,
  assetIn: zeroAddress,
  assetOut: zeroAddress,
  router: zeroAddress,
  amount,
  minOut: 0n,
  routeData: "0x",
});

/** Build the DEPOSIT plan for a chosen allocation (slices from planner.optionSummary). */
export function buildEarnPlan(
  slices: { key: string; percent: number }[],
  amountBase: bigint,
): PlanAction[] {
  return slices
    .map((s) => {
      const pos = POSITIONS[s.key];
      if (!pos) return null;
      return deposit(pos.id, (amountBase * BigInt(s.percent)) / 100n);
    })
    .filter((a): a is PlanAction => a !== null && a.amount > 0n);
}

// The crypto venue + swap router per chain, for executing the ENGINE's crypto slice on-chain. Anvil
// (31337) = the DeployLocal deterministic deploy (wstETH stands in for the crypto held asset; the mock
// router swaps USDC→wstETH). Absent on a chain → the engine plan can't execute crypto there (savings only).
const CRYPTO_VENUES: Record<number, { aave: `0x${string}`; wsteth: `0x${string}`; router: `0x${string}` }> = {
  31337: {
    aave: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    wsteth: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    router: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  },
};
export const cryptoVenues = CRYPTO_VENUES[activeChain.id];

const routerAbi = parseAbi([
  "function swap(address assetIn, address assetOut, uint256 amountIn, uint256 minOut, address to)",
]);

/**
 * Map the ENGINE's savings/crypto split onto the on-chain venues, so the account executes the real plan:
 * DEPOSIT the savings slice into aave, and SWAP the crypto slice USDC→wstETH via the approved router
 * (routeData = the router.swap call the account relays; its balance-delta check enforces minOut). This is
 * the anvil demo path; mainnet would fill routeData/minOut from a real aggregator (0x/1inch) quote instead.
 */
export function buildEnginePlan(
  summary: { savingsPct: number; cryptoPct: number },
  amountBase: bigint,
  account: `0x${string}`,
): PlanAction[] {
  const v = cryptoVenues;
  if (!v) return [];
  const savingsAmt = (amountBase * BigInt(summary.savingsPct)) / 100n;
  const cryptoAmt = amountBase - savingsAmt;
  const actions: PlanAction[] = [];
  if (savingsAmt > 0n) actions.push(deposit(positionId(AAVE_KIND, v.aave), savingsAmt));
  if (cryptoAmt > 0n) {
    const routeData = encodeFunctionData({
      abi: routerAbi,
      functionName: "swap",
      args: [USDC_ADDRESS as `0x${string}`, v.wsteth, cryptoAmt, 0n, account],
    });
    actions.push({
      kind: 2, // SWAP
      positionId: `0x${"00".repeat(32)}`,
      assetIn: USDC_ADDRESS as `0x${string}`,
      assetOut: v.wsteth,
      router: v.router,
      amount: cryptoAmt,
      minOut: 0n,
      routeData,
    });
  }
  return actions;
}

const ZERO_ID = `0x${"00".repeat(32)}` as `0x${string}`;

/**
 * SWAP a held token back to USDC via an approved router — the sell side of the mix (crypto → dollars).
 * `routeData` is the router.swap call the account relays; its balance-delta check enforces `minOut`.
 * Demo: `minOut = 0` (mock router, fixed rate). Mainnet fills `routeData`/`minOut` from an aggregator
 * quote (0x/1inch), and that router must be `routeApproved` in the ProtocolRegistry.
 */
const sellForUsdc = (
  token: `0x${string}`,
  tokenAmount: bigint,
  router: `0x${string}`,
  account: `0x${string}`,
): PlanAction => ({
  kind: 2, // SWAP
  positionId: ZERO_ID,
  assetIn: token,
  assetOut: USDC_ADDRESS as `0x${string}`,
  router,
  amount: tokenAmount,
  minOut: 0n,
  routeData: encodeFunctionData({
    abi: routerAbi,
    functionName: "swap",
    args: [token, USDC_ADDRESS as `0x${string}`, tokenAmount, 0n, account],
  }),
});

/** A position to unwind when closing. Savings → WITHDRAW; a `sell` slice → SWAP the held token to USDC. */
export type ClosePosition = {
  base: bigint; // position value in USD base units — sets each position's proportional share
  key?: string; // savings: POSITIONS[key] lookup (Sepolia venues)
  id?: `0x${string}`; // savings: explicit WITHDRAW position id (overrides key) — e.g. anvil's own aave pool
  /** Crypto/held-asset slice: sell this token back to USDC instead of a protocol WITHDRAW. */
  sell?: { token: `0x${string}`; tokenBalance: bigint; router: `0x${string}`; account: `0x${string}` };
};

/**
 * Build the plan to raise `amountBase` USD by unwinding positions proportionally, back to idle USDC.
 * Savings positions emit a WITHDRAW; a crypto slice emits a SWAP token→USDC, selling the *same*
 * proportional fraction of its token balance. Full close (`amountBase >= total`) unwinds everything.
 */
export function buildClosePlan(positions: ClosePosition[], amountBase: bigint): PlanAction[] {
  const total = positions.reduce((a, p) => a + p.base, 0n);
  if (total === 0n) return [];
  const full = amountBase >= total;
  return positions
    .map((p) => {
      if (p.sell) {
        // sell the same fraction of the token balance that this position contributes to the raise
        const tokenIn = full ? p.sell.tokenBalance : (amountBase * p.sell.tokenBalance) / total;
        if (tokenIn <= 0n) return null;
        return sellForUsdc(p.sell.token, tokenIn, p.sell.router, p.sell.account);
      }
      const id = p.id ?? (p.key ? POSITIONS[p.key]?.id : undefined);
      if (!id) return null;
      const cut = full ? p.base : (amountBase * p.base) / total;
      return withdrawAction(id, cut);
    })
    .filter((a): a is PlanAction => a !== null && a.amount > 0n);
}
