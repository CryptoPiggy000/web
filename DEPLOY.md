# Deploying the web app to Vercel (Base mainnet)

**State as of 2026-07-27: the contracts + all backend services are LIVE on Base.** The web is already
code-ready for Base — `useChainView` buys/sells the crypto slice through the live 0x/KyberSwap aggregator
(`buildBaseEarnPlan` / `buildBaseClosePlan`), and Portfolio reads the ops indexer. **Your remaining work
is env + Vercel deploy + a canary** — no app-code changes needed for Base.

## Live services to wire the app to

| Service | URL / address |
|---|---|
| **Contracts (Base, real funds)** | registry `0x451Ed81bE37303E66Bb4851e58B86B3dCFd6047a`, **factory `0x81af551F6346AE358966f3BF64d16d6105Ea1e8A`** — see `contracts/DEPLOYMENTS.md` |
| **Backend** (public edge: `/market/*`, `/operations/*`) | `https://cryptopiggy-backend-production.ai-suggestion.workers.dev` |
| **Ops indexer** (Portfolio `/account/:addr`, `/stats`) | `https://cryptopiggy-ops-production.ai-suggestion.workers.dev` |
| Engine (private planner) | behind the backend — already wired |

On-chain guards: **$20k global deposit cap, no whitelist (open to all), deposit fee 0** (max 2%).

## Vercel environment variables

| Var | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CHAIN` | `base` | switches the app to Base |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | `0x81af551F6346AE358966f3BF64d16d6105Ea1e8A` | **setting this = CHAIN_MODE** (real on-chain execution) |
| `NEXT_PUBLIC_API_URL` | `https://cryptopiggy-backend-production.ai-suggestion.workers.dev` | backend |
| `NEXT_PUBLIC_OPS_URL` | `https://cryptopiggy-ops-production.ai-suggestion.workers.dev` | Portfolio reads this |
| `NEXT_PUBLIC_PRIVY_APP_ID` | ⚠️ **NEEDED** | a **production** Privy app id (embedded wallet, Base enabled) |
| `NEXT_PUBLIC_PIMLICO_API_KEY` | ⚠️ **NEEDED** | Pimlico key for gasless (EIP-7702 + paymaster); **fund the paymaster** |
| `NEXT_PUBLIC_SPONSORSHIP_POLICY_ID` | ⚠️ **NEEDED** | Pimlico sponsorship policy id |
| `NEXT_PUBLIC_DEPOSIT_FEE_BPS` | `0` | fee off at launch; keep in sync with on-chain `registry.depositFeeBps` if turned on |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | *(optional)* a **public/client-safe Base RPC** | legacy name, used as the generic RPC for public reads in the gasless flow. Leave empty = default transport. **Do NOT put a keyed RPC here — it ships to the browser.** |
| `NEXT_PUBLIC_DEV_WALLET` | **UNSET** | dev-only local anvil wallet — must NOT be set in production |

## Deploy

1. Set the vars above in the Vercel project (Production scope).
2. `vercel --prod` (or push to the connected branch).
3. Sanity: the app should render, and with `NEXT_PUBLIC_FACTORY_ADDRESS` set it runs in **CHAIN_MODE**
   (`usePiggyView` → `useChainView`), executing real `executePlan` on Base.

## Canary (do this before sharing the link)

1. Fund a test wallet with a little **USDC + ETH on Base**.
2. End-to-end: **earn** (deposit → savings to Aave + crypto buy via aggregator) → **Portfolio** (reads ops
   `/account/:addr`) → **close** (withdraw + sell-back via aggregator).
3. Verify the deposit shows in ops `/stats` (users/deposits) and `/account/:addr` (value + activity), and
   the position values correctly.

## Guardrails ⚠️

- The **$20k cap is the safety net** — real deposits are technically possible right now, but **do NOT
  promote real-funds deposits publicly until the legal opinion + canary are done.**
- Gasless needs a **funded** Pimlico paymaster, or users pay their own gas (ETH on Base).

## Already done for you (no action needed)

- Base execution path (`useChainView` → `buildBaseEarnPlan`/`buildBaseClosePlan`, live aggregator quotes).
- Portfolio wired to the ops indexer `/account/:addr` (per-venue positions + activity).
- Deposit-fee display (`NEXT_PUBLIC_DEPOSIT_FEE_BPS`) — shows only when > 0.

## Other threads (not web)

- **BaseScan contract verification** — owned by the contracts side (needs a BaseScan API key).
- **Legal opinion** — parallel human track; gates opening to real funds broadly.
- Ops indexer runbook: `backend/OPS.md`.
