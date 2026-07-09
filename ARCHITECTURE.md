# CryptoPiggy web — architecture & mechanism

This is the notes-for-teammates doc. It explains how the frontend works, what is
real vs simulated today, and — most importantly — the **seams where the contracts
and backend plug in**. If you own `contracts/` or `backend/`, read the "Integration
seams" section: it's the contract the frontend expects from your side.

See also [FLOW.md](./FLOW.md) for the product flow + the proposed backend API.

## What this app is

A beginner-facing, **non-custodial** crypto piggy bank. The user deposits **USDC**
(dollar-denominated, no price volatility), picks a risk appetite, and their money
earns yield. The user always signs from their **own embedded wallet** — the platform
never moves funds. This mirrors the `contracts/` design where `executePlan`, `exit`,
and `withdraw` are all `onlyOwner`.

Everything the user sees is dollars. No chain names, no gas, no seed phrases, no
calldata are surfaced. Those concepts exist only in code.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind v4.
- **Privy** embedded wallet (`@privy-io/react-auth`, `@privy-io/wagmi`) — email/Google
  login, wallet created for the user, keys split 2-of-3 (non-custodial).
- **wagmi + viem** for chain reads/writes.
- Dev chain: **Ethereum Sepolia**. Prod target: **Base** (`NEXT_PUBLIC_CHAIN=base`).

## Currency model — why USDC

We deliberately use USDC, not native ETH. USDC is a stable dollar, so:
- The balance is just "your money in dollars", growing only from yield.
- The risk options differ only by **yield source** (single comparable APY), with no
  confusing "price growth vs yield" distinction.
- It matches the `contracts/` universe (USDC/USDS + Aave + ERC-4626 vault).

Sepolia USDC (Circle): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, 6 decimals.
See `src/lib/chain.ts` (`USDC_ADDRESS`, `USDC_DECIMALS`, per-chain map).

## What is REAL vs SIMULATED today (Phase 0)

The contracts are not yet deployed to Sepolia/Base, so the app runs in **Phase 0**:

| Area | Status | Where |
|---|---|---|
| Login + embedded wallet | **Real** | Privy, `src/components/providers.tsx` |
| Piggy address | **Real** | `src/lib/usePiggy.ts` — = the embedded EOA today |
| USDC balance | **Real** (on-chain `balanceOf`) | `src/lib/usePiggy.ts` |
| Deposit | **Real** | send USDC to the address; balance polls every 5s |
| Withdraw | **Real** (ERC-20 `transfer`) | `src/components/withdraw-sheet.tsx` |
| Planner (risk → allocation) | **Simulated** (mock) | `src/lib/planner.ts` |
| Earning / yield accrual / harvest | **Simulated** (localStorage) | `src/lib/sim.ts` |

The simulated balance shown = real on-chain USDC + simulated locked yield + simulated
live-accruing yield. Only the **real USDC** is actually withdrawable. Yield accrual is
sped up (`DEMO_SPEED` in `sim.ts`) so the balance visibly climbs during a demo; the
stated APY labels stay honest.

### Two-bucket model (Resting vs Earning)

Money is split into two buckets that the user moves between explicitly:

- **Resting** = `realBalance − earningPrincipal`. In the wallet; the only bucket that
  is **withdrawable** (real USDC) and **earn-able**.
- **Earning** = `earningPrincipal` (real USDC notionally at work) + accrued yield (sim).

Transitions: deposit → Resting; "Start earning / Earn more" moves Resting → Earning
(`earnMore` in `sim.ts`); **Harvest** collects interest → Resting (`harvest`, with fee);
**Close position** moves earning principal → Resting (`exitToWallet`, may be async);
Withdraw pulls from Resting only. To withdraw money that is earning, the user must Close a
position first (deliberate manual step — pool release isn't instant). This mirrors the real
contract path `exit()` (unwind to idle) → `withdraw()` (to owner).
When contracts land, Earning becomes real on-chain positions and this sim bucket is
replaced by reads of the account's positions.

`src/lib/sim.ts` (positions, `earnSince`, `harvestedWei`, `accruedWei`,
`yieldPerYearWei`, `DEMO_SPEED`) is **throwaway** — it exists only until the contracts
land, then all of it is replaced by on-chain reads.

## Integration seams — what contracts/backend plug into

Three switches turn Phase 0 into the real thing. None require rewriting the UI.

### 1. Account factory → piggy address (`contracts`)

`src/lib/usePiggy.ts` computes the piggy address:
- **Today:** `piggyAddress = embedded EOA`.
- **When `NEXT_PUBLIC_FACTORY_ADDRESS` is set:** it calls `AccountFactory.predict(owner, 0x0)`
  (CREATE2 counterfactual) and uses that. The `predict(address,bytes32)` ABI is already
  wired. Deploying the account happens on the first `executePlan` (batched).

So `contracts/` needs to: deploy `AccountFactory` to the target chain and give us the
address. The frontend already knows how to derive and fund the counterfactual account.

### 2. Planner API → Plan (`backend`)

`src/lib/planner.ts` `previewPlan(idle, preference)` currently returns a **mock** Plan
(the strategy allocation + `Action[]`). In production this is served by the backend as
`GET /market/strategies` (the options) + `POST /operations/earn` (the built op). The
returned `PlanAction[]` mirrors the on-chain **`Action` struct in `contracts/src/Types.sol`**
(kind, positionId, assetIn, assetOut, router, amount, minOut, routeData). See `src/lib/types.ts`.

So `backend/` needs to: read on-chain state, build each operation (earn / harvest / exit /
withdraw) as an `Action[]` + a gas-sponsored UserOp, hand the client one thing to sign,
and submit it. The frontend feeds `actions` straight into `executePlan` — no translation
layer. **Full endpoint contract: [API.md](./API.md)** (also covers fiat on-ramp).

### 3. executePlan → on-chain (`contracts` + gas sponsorship)

When wired, the "Start earning" and "Harvest"/"Withdraw" actions become a single
signed `executePlan(Action[])` (batched with `createAccount` on first use) via an
**EIP-7702 smart-EOA + paymaster** so the user needs no ETH for gas. Because 7702 keeps
`msg.sender == owner`, the `onlyOwner` checks in `SmartInvestmentAccount` work
unchanged — no contract changes needed for gas sponsorship.

## File map

```
src/lib/chain.ts        chain + USDC + factory config (Sepolia / Base)
src/lib/types.ts        Preference, Plan, PlanAction (Action mirrors Types.sol)
src/lib/planner.ts      earn strategies — Phase 0 mock == future /market/strategies + /operations/earn
src/lib/sim.ts          Phase 0 simulation store (throwaway): earn, yield, harvest, close, sandbox fiat
src/lib/usePiggy.ts     piggy address + USDC balance (embedded EOA now, predict() later)
src/lib/format.ts       dollar / address / time formatting
src/components/button.tsx        shared Button (variants/sizes/icon) — used app-wide
src/components/hero-balance.tsx  live-ticking balance (rAF, DOM-write)
src/components/balance-card.tsx  balance framed over the piggy background
src/components/*-sheet.tsx       bottom sheets: deposit, withdraw, grow(=Earn hub), settings
src/app/page.tsx        landing
src/app/app/page.tsx    the single home screen
```

## Design / UX decisions (so the intent is legible)

- **Single screen, no tabs.** Everything is the home screen + bottom sheets.
- **Balance is the hero** — big, centred, live-ticking upward as yield accrues, framed
  over a large piggy watermark.
- **Home actions by state.** Empty → one big "Add money". Funded → primary "Earn" +
  a secondary row "Add money · Withdraw" (both always reachable). The split
  "In wallet · Earning" shows when earning.
- **Earn sheet is tabbed.** "Earn money" (deploy resting into a strategy) and "Your
  positions" (Harvest interest → wallet with a fee; Close position = unwind principal,
  may be async). Withdraw (wallet → external) is a separate sheet, manual/resting-only —
  close a position first to withdraw earning money (pool release isn't instant).
- **Shared `Button`** is the one button primitive for the whole app (variants, sizes,
  icons). Reuse it; don't hand-roll button classes.
- **Motion**: sheets slide up + fade, balance counts up on deposit and ticks up on
  yield, piggy pops when a deposit lands. All respect `prefers-reduced-motion`.
- **Copy**: English, minimal, no crypto jargon.

## Run locally

```shell
cp .env.example .env.local   # set NEXT_PUBLIC_PRIVY_APP_ID (dashboard.privy.io)
npm install
npm run dev                  # http://localhost:3000
```
