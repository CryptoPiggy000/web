import { encodeAbiParameters, keccak256 } from "viem";

// Mapping between the ENGINE's venue ids and the CHAIN's position ids.
//
// The engine names venues with its own string keys (`base:aave-v3:usdc`, `base:morpho:0x<vault>`) because
// it is an untrusted advisor with no on-chain identity. The account, meanwhile, dispatches on
// `keccak256(abi.encode(adapterType, target, asset))` from the registry. Nothing translated between the
// two, so the app took only the engine's savings/crypto RATIO and put 100% of savings into Aave —
// discarding the engine's actual venue choice and, with it, the whole point of the planner.
//
// Everything here is pure so the money maths is testable without a chain.

export const ADAPTER_ERC4626 = 1 as const; // AdapterType: NONE=0, ERC4626=1, AAVE=2
export const ADAPTER_AAVE = 2 as const;
export type Adapter = typeof ADAPTER_ERC4626 | typeof ADAPTER_AAVE;

/** A venue as the on-chain registry reports it. */
export interface RegistryVenue {
  adapter: Adapter;
  target: `0x${string}`;
  asset: `0x${string}`;
}

/** A held position: a registry venue plus what the account currently has in it (base-asset units). */
export interface HeldPosition extends RegistryVenue {
  base: bigint;
}

export interface DepositAction {
  adapter: Adapter;
  target: `0x${string}`;
  positionId: `0x${string}`;
  amount: bigint;
}

const isAddress = (s: string): s is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(s);

/** keccak256(abi.encode(adapterType, target, asset)) — must match ProtocolRegistry.positionId. */
export function onChainPositionId(adapter: Adapter, target: `0x${string}`, asset: `0x${string}`): `0x${string}` {
  return keccak256(
    encodeAbiParameters([{ type: "uint8" }, { type: "address" }, { type: "address" }], [adapter, target, asset]),
  );
}

/**
 * Resolve an engine `position_id` to the adapter + target the chain understands.
 * Returns null for anything we don't recognise — we skip such a venue rather than guess, because a wrong
 * target would either revert the plan or send funds somewhere the close path can't find.
 */
export function engineVenue(
  engineId: string,
  aavePool: `0x${string}`,
): { adapter: Adapter; target: `0x${string}` } | null {
  if (!engineId) return null;
  if (engineId === "base:aave-v3:usdc") return { adapter: ADAPTER_AAVE, target: aavePool };
  const morpho = engineId.startsWith("base:morpho:") ? engineId.slice("base:morpho:".length) : null;
  if (morpho && isAddress(morpho)) return { adapter: ADAPTER_ERC4626, target: morpho };
  return null;
}

const sameVenue = (a: { adapter: number; target: string }, b: { adapter: number; target: string }) =>
  a.adapter === b.adapter && a.target.toLowerCase() === b.target.toLowerCase();

/**
 * Split `savingsAmount` across the engine's SAVINGS allocations, in proportion to their pct.
 *
 * Venues the registry hasn't approved are dropped and their share is redistributed across the rest — an
 * unapproved target would revert the entire `executePlan`, taking the valid legs down with it. The last
 * deposit absorbs the rounding remainder so the full amount is always deployed.
 */
export function savingsDeposits(
  allocation: { position_id: string; pct: number; class: "savings" | "crypto" }[],
  savingsAmount: bigint,
  approved: RegistryVenue[],
  aavePool: `0x${string}`,
  asset: `0x${string}`,
): DepositAction[] {
  if (savingsAmount <= 0n) return [];

  const legs = allocation
    .filter((a) => a.class === "savings" && a.pct > 0)
    .map((a) => ({ venue: engineVenue(a.position_id, aavePool), pct: a.pct }))
    .filter((l): l is { venue: { adapter: Adapter; target: `0x${string}` }; pct: number } => l.venue !== null)
    .filter((l) => approved.some((v) => sameVenue(v, l.venue)));

  const totalPct = legs.reduce((s, l) => s + l.pct, 0);
  if (legs.length === 0 || totalPct <= 0) return []; // caller decides the fallback

  let assigned = 0n;
  return legs.map((l, i) => {
    const amount =
      i === legs.length - 1
        ? savingsAmount - assigned // remainder: never lose dust to rounding
        : (savingsAmount * BigInt(l.pct)) / BigInt(totalPct);
    assigned += amount;
    return {
      adapter: l.venue.adapter,
      target: l.venue.target,
      positionId: onChainPositionId(l.venue.adapter, l.venue.target, asset),
      amount,
    };
  });
}

/**
 * Raise `amount` by unwinding every held position proportionally to its size.
 *
 * The previous close path only ever withdrew from Aave, so anything deployed to a vault was stranded —
 * the user could not get it back through the app. Capped at what each position actually holds, so a
 * request larger than the deployed total simply empties everything.
 */
export function closeWithdrawals(amount: bigint, held: HeldPosition[]): DepositAction[] {
  const live = held.filter((p) => p.base > 0n);
  const total = live.reduce((s, p) => s + p.base, 0n);
  if (total === 0n || amount <= 0n) return [];

  const raise = amount > total ? total : amount;
  let assigned = 0n;
  return live.map((p, i) => {
    const take = i === live.length - 1 ? raise - assigned : (raise * p.base) / total;
    assigned += take;
    return {
      adapter: p.adapter,
      target: p.target,
      positionId: onChainPositionId(p.adapter, p.target, p.asset),
      amount: take,
    };
  });
}
