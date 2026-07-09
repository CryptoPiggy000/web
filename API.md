# CryptoPiggy backend API — contract v0

This is the API the web/mobile clients expect from `backend`. It's the source of truth
for building the backend. The frontend is written against these shapes (mocked in Phase 0
via `src/lib/planner.ts` + `src/lib/sim.ts`); swapping the mocks for these endpoints is
the Phase 1 job.

Design principle: **the client is dumb, the backend orchestrates.** The user never deals
with gas, chains, or crypto. The backend builds every on-chain operation, sponsors its
gas, hands the client a single thing to sign, and submits it. See "Operations" below.

---

## Conventions

- Base URL: `https://api.cryptopiggy.…/v0` — client reads it from `NEXT_PUBLIC_API_URL`. Path-versioned.
- All requests/responses are JSON. All authed requests send `Authorization: Bearer <session>`.
- **Money** is always an integer **string in USDC base units** (6 decimals): `"1500000"` = $1.50.
  Never floats. Responses may add a `usd` convenience string (`"1.50"`) for display only.
- Addresses are `0x`-checksummed strings. Timestamps are epoch **milliseconds**.
- **Idempotency:** every mutating POST accepts an `Idempotency-Key` header (client sends a
  UUID per user-intent). Safe to retry `/operations/*/submit` and `/onramp/session` without
  double-spending. Backend dedupes on the key for 24h.
- Errors: HTTP status + `{ "error": { "code": "SNAKE_CASE", "message": "human text" } }`.
  Codes the client handles specially: `unauthorized`, `insufficient_funds`,
  `amount_too_small`, `onramp_unavailable_region`, `operation_expired`.

---

## 1. Auth

The user logs in with Privy (email/Google) on the client; Privy issues an identity token.

### `POST /auth/verify`
```jsonc
// req
{ "privyToken": "…" }
// res
{ "session": "<jwt>", "expiresAt": 1750000000000,
  "user": { "id": "usr_…", "owner": "0xEmbeddedEOA…", "piggy": "0xAccount…" } }
```
Backend verifies the Privy token, upserts the user, and returns the session + the user's
**owner** (embedded EOA) and **piggy** (their SmartInvestmentAccount address, counterfactual
via `AccountFactory.predict` until first use). All later calls use `Bearer <session>`.
**Refresh:** on `401 unauthorized` / past `expiresAt`, the client re-calls `/auth/verify`
with a fresh Privy token to get a new session (no separate refresh endpoint).

---

## 2. Portfolio & preference

### `GET /me/portfolio`
The single read the home screen needs. Buckets + positions + live yield.
```jsonc
{
  "total":   { "base": "20500000", "usd": "20.50" },   // = resting + earning (earning already includes accrued)
  "resting": { "base": "5000000",  "usd": "5.00", "pendingBase": "0" }, // in wallet: withdrawable + earn-able; pendingBase = an in-flight exit still arriving
  "earning": { "base": "15500000", "usd": "15.50" },   // principal + accrued
  "principal": { "base": "15000000" },
  "accrued":   { "base": "500000" },                   // yield not yet harvested (part of earning)
  "apyBps": 345,                                        // blended, 345 = 3.45%/yr
  "positions": [
    { "key": "aave",  "name": "Aave lending",       "base": "7500000", "apyBps": 280 },
    { "key": "vault", "name": "Stable-yield vault",  "base": "7500000", "apyBps": 410 }
  ]
}
```
Invariant: `total = resting + earning`, `earning = principal + accrued`, `resting =
realUSDCbalance − principal`. Client can also read balances on-chain directly; the backend
enriches with APY, names, pending exits, and (later) fiat value.

### `GET /me/preference` · `PUT /me/preference`
```jsonc
{ "goal": "tich-luy", "riskTolerance": "mot-chut", "horizon": "6-24-thang" }
```

### `GET /market/strategies`
The earn options with live rates (drives the chooser).
```jsonc
{ "strategies": [
  { "id": "safe",     "label": "Safe",         "apyBps": 280,
    "mix": [ { "key": "aave", "name": "Aave lending", "pct": 100, "apyBps": 280 } ] },
  { "id": "balanced", "label": "Balanced",     "apyBps": 345, "mix": [ … ] },
  { "id": "growth",   "label": "Higher yield", "apyBps": 410, "mix": [ … ] }
] }
```

---

## 3. Operations (the core: earn / harvest / withdraw)

Every state change is an **operation**: backend builds it (including the on-chain
`Action[]` and a **gas-sponsored** UserOperation), returns one payload to sign, the client
signs with the Privy wallet, then the backend submits and reports status.

Because we use **EIP-7702 + a paymaster**, `msg.sender` stays the owner, so the contract's
`onlyOwner` checks pass and the user needs **no ETH**. Gas details never reach the client.

### Build — `POST /operations/earn`
```jsonc
// req  — deploy resting money into a strategy
{ "amount": "5000000", "strategy": "balanced" }
// res
{ "operationId": "op_…", "expiresAt": 1750000300000,
  "preview": {                       // for the confirm screen, in human terms
    "kind": "earn", "amount": { "base": "5000000", "usd": "5.00" },
    "mix": [ { "name": "Aave lending", "pct": 50, "apyBps": 280 }, … ],
    "estYearlyBase": "180000", "feeBase": "0" },
  "actions": [ /* Action[] mirroring contracts/src/Types.sol, fed to executePlan */ ],
  "toSign": { "type": "userOpHash", "value": "0x…" }   // the ONE thing the client signs
}
```

### Build — `POST /operations/harvest`
```jsonc
// req  — collect accrued INTEREST into the wallet (resting). A fee applies.
//        Only the yield, not the principal — principal stays earning.
{}
// res  — same envelope; preview carries the economics
{ "operationId": "op_…", "expiresAt": …,
  "preview": { "kind": "harvest",
    "grossBase": "500000", "feeBase": "5000", "netBase": "495000" },
  "actions": [ … ], "toSign": { "type": "userOpHash", "value": "0x…" } }
```

### Build — `POST /operations/exit`  (close position)
```jsonc
// req  — close (unwind) an earning position: pull PRINCIPAL out of the pool back to
//        the wallet (resting). Separate from harvest (which is interest only) and from
//        withdraw. May NOT settle instantly (queues / cooldowns / liquidity).
{ "amount": "8000000" }
// res
{ "operationId": "op_…", "expiresAt": …,
  "preview": { "kind": "exit", "amount": { "base": "8000000", "usd": "8.00" },
    "settlesInstantly": false, "etaSeconds": 60 },
  "actions": [ … ], "toSign": { "type": "userOpHash", "value": "0x…" } }
```
After it settles (poll `GET /operations/:id` → `confirmed`), the amount shows up in
`resting` and becomes withdrawable. `/me/portfolio` should expose any pending exit as
`resting.pendingBase` so the client can show "arriving".

### Build — `POST /operations/withdraw`
```jsonc
// req  — send USDC out. Only from the wallet (resting); does NOT touch the pool.
//        To withdraw earning money, call /operations/exit first, then withdraw.
{ "to": "0xExternal…", "amount": "5000000" }   // amount ≤ resting
// res  — 400 insufficient_funds if amount > resting (client should route to exit)
{ "operationId": "op_…", "expiresAt": …,
  "preview": { "kind": "withdraw", "amount": { "base": "5000000", "usd": "5.00" },
    "to": "0xExternal…", "feeBase": "0" },
  "actions": [ … ], "toSign": { "type": "userOpHash", "value": "0x…" } }
```
**Contract note (for the engine):** `SmartInvestmentAccount.withdraw(token, amount)` sends
to the **owner EOA only** — it has no external-address param. So for `to ≠ owner`, the op
must be **two steps batched in one UserOp**: `account.withdraw(usdc, amount)` (account →
owner) then ERC-20 `transfer(to, amount)` (owner → external). For `to == owner`, a single
`withdraw` suffices. (Phase 0 client does a raw ERC-20 transfer from the EOA since funds
already sit there.)

### Submit — `POST /operations/:id/submit`
```jsonc
// req  — the client signs res.toSign.value with the Privy wallet and returns it
{ "signature": "0x…" }
// res
{ "status": "pending", "txHash": "0x…" }
```
Backend attaches the signature to the UserOp, submits to the bundler (paymaster sponsors
gas), returns the tx hash. `operationId` expired (past `expiresAt`) → `operation_expired`,
client re-builds.

### Poll — `GET /operations/:id`
```jsonc
{ "status": "confirmed", "txHash": "0x…", "confirmedAt": 1750000400000 }
// status ∈ pending | confirmed | failed;  failed adds { "reason": "…" }
```

> Alternative if you prefer client-submits: return a full sponsored `userOp` object instead
> of `toSign`, and let the client send it to the bundler. We defaulted to backend-submits so
> bundler/paymaster keys and policy stay server-side. Pick one and we align the client.

---

## 4. On-ramp (fiat → USDC)

Let the user pay with **card / PayPal / bank** and receive USDC in their piggy, without ever
touching crypto. The backend wraps a third-party on-ramp (candidates: MoonPay, Transak,
Stripe Onramp, Coinbase Onramp) — the client only opens a hosted checkout URL, so **we never
see or store card/PayPal credentials** (the provider handles PCI + KYC).

### `POST /onramp/session`
```jsonc
// req
{ "amountUsd": "50.00", "method": "card",         // card | paypal | bank
  "redirectUrl": "https://app.cryptopiggy.…/return" }
// res
{ "sessionId": "os_…",
  "checkoutUrl": "https://buy.provider.com/…",     // client opens this (hosted widget)
  "destination": "0xPiggy…",                        // provider sends USDC here
  "provider": "moonpay",
  "quote": { "minUsd": "10.00", "maxUsd": "2000.00", // provider limits for the region
             "feeUsd": "1.75", "estUsdcBase": "48250000" } }  // est. USDC after fees
```
Backend picks the provider, creates the session pinned to the user's **piggy address** and
the desired amount, and signs/returns the hosted URL. The client opens it; the user pays and
does KYC entirely on the provider. Delivered USDC lands at the piggy address and shows up via
the normal balance read — same as a crypto deposit.

### `GET /onramp/session/:id`
```jsonc
{ "status": "completed", "usdcBase": "49250000", "txHash": "0x…" }
// status ∈ created | processing | completed | failed
```

### `POST /onramp/webhook`  (provider → backend, not the client)
Provider calls this on payment/settlement; backend reconciles the session and (optionally)
push-notifies the user.

**Region note:** on-ramp coverage and payment methods are **region-locked** (esp. card/PayPal
availability and KYC rules). The backend should return `onramp_unavailable_region` with the
supported alternatives so the client can fall back to the crypto-deposit option. Confirm
target regions early — it drives provider choice.

---

## 5. Activity

### `GET /me/activity?limit=50`
```jsonc
{ "items": [
  { "id": "act_…", "ts": 1750000400000, "type": "earn",     "summary": "Put $5.00 to work",     "txHash": "0x…" },
  { "id": "act_…", "ts": 1749990000000, "type": "onramp",   "summary": "Added $50 via card",     "txHash": "0x…" },
  { "id": "act_…", "ts": 1749980000000, "type": "harvest",  "summary": "Harvested $0.49",        "txHash": "0x…" },
  { "id": "act_…", "ts": 1749970000000, "type": "withdraw", "summary": "Withdrew $8.00",         "txHash": "0x…" }
] }
// type ∈ onramp | deposit | earn | harvest | exit | withdraw   (exit = close position)
```

---

## Appendix — `Action` (mirrors `contracts/src/Types.sol`)

The `actions` array in every operation is fed straight into `SmartInvestmentAccount.executePlan`.
No translation layer between backend output and the on-chain call.
```solidity
struct Action {
  ActionKind kind;      // 0 = DEPOSIT, 1 = WITHDRAW, 2 = SWAP
  bytes32   positionId; // DEPOSIT / WITHDRAW
  address   assetIn;    // SWAP
  address   assetOut;   // SWAP
  address   router;     // SWAP (must be an approved route)
  uint256   amount;     // amount in; WITHDRAW: type(uint).max = all
  uint256   minOut;     // SWAP floor
  bytes     routeData;  // SWAP router calldata
}
```

## Endpoint summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/verify` | Privy token → session + owner/piggy |
| GET  | `/me/portfolio` | buckets + positions + APY |
| GET/PUT | `/me/preference` | risk preference |
| GET  | `/market/strategies` | earn options + live APY |
| POST | `/operations/earn` | build earn op → sign |
| POST | `/operations/harvest` | build harvest op (fee) → sign |
| POST | `/operations/exit` | unwind earning → wallet (may be async) → sign |
| POST | `/operations/withdraw` | build withdraw op (wallet only) → sign |
| POST | `/operations/:id/submit` | submit signature → txHash |
| GET  | `/operations/:id` | poll status |
| POST | `/onramp/session` | fiat checkout URL (card/PayPal) |
| GET  | `/onramp/session/:id` | on-ramp status |
| POST | `/onramp/webhook` | provider → backend settlement |
| GET  | `/me/activity` | history |
