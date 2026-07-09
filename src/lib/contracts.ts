import { encodeAbiParameters, keccak256, parseAbi, zeroAddress } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS } from "./chain";

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

/** Build the WITHDRAW plan to pull `amountBase` out of the pool, proportional to each position. */
export function buildClosePlan(
  positions: { key: string; base: bigint }[],
  amountBase: bigint,
): PlanAction[] {
  const total = positions.reduce((a, p) => a + p.base, 0n);
  if (total === 0n) return [];
  return positions
    .map((p) => {
      const pos = POSITIONS[p.key];
      if (!pos) return null;
      const cut = amountBase >= total ? p.base : (amountBase * p.base) / total;
      return withdrawAction(pos.id, cut);
    })
    .filter((a): a is PlanAction => a !== null && a.amount > 0n);
}
