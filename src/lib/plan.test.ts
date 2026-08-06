import { describe, it, expect } from "vitest";
import { engineVenue, savingsDeposits, closeWithdrawals, type RegistryVenue } from "./plan";

// The web used to take ONLY the engine's savings/crypto ratio and dump 100% of savings into Aave — the
// lowest-yielding venue in the set — discarding which vaults the engine actually chose. These are the pure
// pieces that fix that: map an engine position_id to its on-chain identity, split a deposit across the
// engine's venues, and unwind every held venue on close (money stranded in a vault the close path can't
// see is the failure that matters most here).

const AAVE = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const GT = "0xee8f4ec5672f09119b96ab6fb59c27e1b7e44b61";
const BBQ = "0xbeefa7b88064feef0cee02aaebbd95d30df3878f";

// what the registry returns (adapter 1 = ERC4626, 2 = AAVE)
const VENUES: RegistryVenue[] = [
  { adapter: 2, target: AAVE, asset: USDC },
  { adapter: 1, target: GT as `0x${string}`, asset: USDC },
  { adapter: 1, target: BBQ as `0x${string}`, asset: USDC },
];

describe("engineVenue — engine position_id → on-chain identity", () => {
  it("maps the Aave id", () => {
    expect(engineVenue("base:aave-v3:usdc", AAVE)).toEqual({ adapter: 2, target: AAVE });
  });

  it("maps a morpho id by extracting the vault address", () => {
    expect(engineVenue(`base:morpho:${GT}`, AAVE)).toEqual({ adapter: 1, target: GT });
  });

  it("is case-insensitive on the address", () => {
    expect(engineVenue(`base:morpho:${GT.toUpperCase().replace("0X", "0x")}`, AAVE)?.target?.toLowerCase()).toBe(GT);
  });

  it("returns null for an unknown id shape rather than guessing", () => {
    expect(engineVenue("solana:whatever:xyz", AAVE)).toBeNull();
    expect(engineVenue("base:morpho:not-an-address", AAVE)).toBeNull();
    expect(engineVenue("", AAVE)).toBeNull();
  });
});

describe("savingsDeposits — split across the engine's venues", () => {
  const alloc = (position_id: string, pct: number) => ({ position_id, pct, class: "savings" as const });

  it("emits one deposit per savings venue, proportional to pct", () => {
    const out = savingsDeposits([alloc("base:aave-v3:usdc", 20), alloc(`base:morpho:${GT}`, 30)], 1_000_000n, VENUES, AAVE, USDC);
    expect(out).toHaveLength(2);
    // 20 and 30 of a 50-pt savings total -> 40% / 60% of the savings amount
    expect(out[0].amount + out[1].amount).toBe(1_000_000n);
    expect(out[0].amount).toBe(400_000n);
  });

  it("ignores crypto allocations (those are swaps, not deposits)", () => {
    const out = savingsDeposits(
      [alloc("base:aave-v3:usdc", 50), { position_id: "0x4200", pct: 50, class: "crypto" as const }],
      1_000_000n, VENUES, AAVE, USDC,
    );
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(1_000_000n); // the whole savings budget
  });

  it("SKIPS venues the registry has not approved — an unapproved deposit would revert the whole plan", () => {
    const notApproved = "0x1111111111111111111111111111111111111111";
    const out = savingsDeposits(
      [alloc("base:aave-v3:usdc", 50), alloc(`base:morpho:${notApproved}`, 50)],
      1_000_000n, VENUES, AAVE, USDC,
    );
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(1_000_000n); // its share is redistributed, never left unspent
  });

  it("gives the remainder to the last venue so nothing is lost to rounding", () => {
    const out = savingsDeposits(
      [alloc("base:aave-v3:usdc", 33), alloc(`base:morpho:${GT}`, 33), alloc(`base:morpho:${BBQ}`, 34)],
      1_000_001n, VENUES, AAVE, USDC,
    );
    expect(out.reduce((s, a) => s + a.amount, 0n)).toBe(1_000_001n);
  });

  it("returns nothing when there is no approved savings venue at all", () => {
    expect(savingsDeposits([alloc("base:morpho:0x9999999999999999999999999999999999999999", 100)], 1_000n, VENUES, AAVE, USDC)).toEqual([]);
  });
});

describe("closeWithdrawals — unwind every held venue", () => {
  const held = [
    { adapter: 2 as const, target: AAVE, asset: USDC, base: 600_000n },
    { adapter: 1 as const, target: GT as `0x${string}`, asset: USDC, base: 400_000n },
  ];

  it("unwinds ALL venues proportionally, not just Aave", () => {
    const out = closeWithdrawals(500_000n, held);
    expect(out).toHaveLength(2); // the old code only ever touched Aave -> the vault was stranded
    expect(out.reduce((s, a) => s + a.amount, 0n)).toBe(500_000n);
    expect(out[0].amount).toBe(300_000n); // 60% of the raise from the 60% position
  });

  it("full close empties every position", () => {
    const out = closeWithdrawals(1_000_000n, held);
    expect(out.reduce((s, a) => s + a.amount, 0n)).toBe(1_000_000n);
  });

  it("skips empty positions", () => {
    const out = closeWithdrawals(100_000n, [...held, { adapter: 1 as const, target: BBQ as `0x${string}`, asset: USDC, base: 0n }]);
    expect(out).toHaveLength(2);
  });

  it("raising more than is deployed takes everything, never over-withdraws a position", () => {
    const out = closeWithdrawals(5_000_000n, held);
    expect(out.reduce((s, a) => s + a.amount, 0n)).toBe(1_000_000n);
  });
});
