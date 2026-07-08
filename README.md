# CryptoPiggy — web

The production web app: a non-custodial crypto piggy bank (Next.js 16 + Privy embedded wallet +
wagmi/viem). Beginner-facing — the user deposits **USDC**, picks a risk appetite, and their money
earns yield, always signing from their own wallet.

Docs:
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how it works, what's real vs simulated, and the seams
  where `contracts`/`backend` plug in. **Read this first.**
- [FLOW.md](./FLOW.md) — product flow + the proposed backend API contract.

> The local **contracts demo** (the viem single-page app that drives anvil) lives in the contracts
> repo: [`contracts/demo/`](https://github.com/CryptoPiggy000/contracts/tree/main/demo).

## Status — Phase 0

Runs today on Base Sepolia with **no dependency on the contracts/backend repos**:

- Real: Privy login (email/Google) + embedded wallet, native ETH deposit (QR + balance polling),
  native ETH withdraw, activity log.
- Simulated: the planner (client-side mock with the same interface as the future backend
  `POST /plans/preview`) and plan execution (positions stored in localStorage).
- Piggy address = the embedded wallet itself. When `AccountFactory` is deployed on Base, set
  `NEXT_PUBLIC_FACTORY_ADDRESS` and the app switches to the counterfactual address via `predict()`.

## Run

```shell
cp .env.example .env.local   # fill NEXT_PUBLIC_PRIVY_APP_ID (dashboard.privy.io)
npm install
npm run dev                  # http://localhost:3000
```

## Structure

```
src/lib/chain.ts      chain + factory config (Base / Base Sepolia)
src/lib/types.ts      Plan/Action types (Action mirrors contracts/src/Types.sol)
src/lib/planner.ts    planner client — Phase 0 mock, future: backend API
src/lib/sim.ts        Phase 0 simulation store (localStorage)
src/lib/usePiggy.ts   piggy address + balance hook (EOA now, predict() later)
src/app/              landing + /app: dashboard, deposit, plan, withdraw, activity, settings
```
