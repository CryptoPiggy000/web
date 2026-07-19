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

## Status — wired to the live engine, not yet on Vercel

The app now talks to the **live engine** and has the real earn/close paths built:

- **v2 engine chooser + View plan** — strategies + full plan come from the deployed backend's
  `/market/*` (`NEXT_PUBLIC_API_URL` → `https://cryptopiggy-backend-production.ai-suggestion.workers.dev`),
  i.e. the real market-intelligence planner over real Base data.
- **Execution** — the earn flow builds the engine's plan and signs `executePlan`; the **sell-back path**
  (crypto → USDC on close) is wired; verified end-to-end on a local anvil via the mock-Privy dev wallet.
- **First-run Terms acceptance gate** (`components/terms-gate.tsx`) + `/terms` + `/privacy` pages.
- Still Privy login (email/Google) + embedded wallet; gasless earn via EIP-7702 + paymaster.

**Not yet deployed to Vercel**, and on-chain execution needs the **Base contracts** (`../contracts`
`DeployBase`, not yet broadcast). Legal copy in the Terms/Privacy pages is a template pending review.
Some flows (fiat on-ramp, portfolio) still use the local sim (`src/lib/sim.ts`) until wired.
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
