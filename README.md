# CryptoPiggy — web

The production web app: a non-custodial crypto piggy bank (Next.js 16 + Privy embedded wallet +
wagmi/viem). Beginner-facing — the user deposits **USDC**, picks a risk appetite, and their money
earns yield, always signing from their own wallet.

Docs:
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how it works, what's real vs simulated, and the seams
  where `contracts`/`backend` plug in. **Read this first.**
- [API.md](./API.md) — the backend API contract (auth, portfolio, operations, fiat on-ramp).
  **For whoever builds `backend`.**
- [FLOW.md](./FLOW.md) — product flow.

> The local **contracts demo** (the viem single-page app that drives anvil) lives in the contracts
> repo: [`contracts/demo/`](https://github.com/CryptoPiggy000/contracts/tree/main/demo).

## Status — Phase 0

Runs today on **Ethereum Sepolia** with **no dependency on the contracts/backend repos**:

- Real: Privy login (email/Google) + embedded wallet, **USDC** deposit (QR + balance polling)
  and withdraw, activity.
- Simulated (localStorage, `src/lib/sim.ts`): the earn strategies/planner, yield accrual,
  harvest, and close-position. Fiat on-ramp (card/PayPal) has a **dev sandbox** that simulates
  the checkout.
- Piggy address = the embedded wallet itself. When `AccountFactory` is deployed, set
  `NEXT_PUBLIC_FACTORY_ADDRESS` and the app switches to the counterfactual address via `predict()`.
- Single screen + bottom sheets (no sub-routes). Two-bucket money model (Resting / Earning).

## Run

```shell
cp .env.example .env.local   # fill NEXT_PUBLIC_PRIVY_APP_ID (dashboard.privy.io)
npm install
npm run dev                  # http://localhost:3000
```

## Structure

```
src/lib/chain.ts        chain + USDC + factory config (Sepolia dev / Base prod)
src/lib/types.ts        Preference / Plan / PlanAction (Action mirrors contracts/src/Types.sol)
src/lib/planner.ts      earn strategies — Phase 0 mock (future: backend /market/strategies + /operations/earn)
src/lib/sim.ts          Phase 0 simulation store: earn / harvest / close / sandbox fiat (throwaway)
src/lib/usePiggy.ts     piggy address + USDC balance (EOA now, predict() later)
src/components/         Button, sheets (deposit/withdraw/grow/settings), balance-card, hero-balance
src/app/app/page.tsx    the single home screen
```
