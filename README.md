# CryptoPiggy — web

The web frontend. Today it hosts a **local dApp demo** that drives the real contracts on
[anvil](https://book.getfoundry.sh/anvil/); the production Next.js app (Preference → preview → execute)
comes later.

## Local dApp demo — `index.html`

A single-page app that talks to a local anvil node — no wallet extension, no testnet. It uses anvil's
built-in dev accounts, so every button sends a real transaction you can watch land.

### Run it (3 terminals)

**1 · a fresh anvil**
```shell
anvil
```
Restart it fresh each run so the deployed addresses stay deterministic.

**2 · deploy the contracts + mock protocols** (from the `contracts` repo)
```shell
cd ../contracts   # the CryptoPiggy000/contracts submodule
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

**3 · serve this app**
```shell
python3 -m http.server 5173      # (any static server)
# open http://localhost:5173
```

### What you'll see

The app creates your account once, then each button is a live tx:

- **Get test USDC** → 1000 USDC lands as **Idle**.
- **Supply → Aave**, **Swap → wstETH**, **300 → USDS → Vault**, **Rebalance (1 plan)** — funds move
  between Idle · Held · Deployed, each an `executePlan(...)`.
- **Exit** / **Withdraw** — back to Idle, then out to **your wallet** (the only external door).
- **🦹 Platform: drain me** → `executePlan` from a *different* account → reverts **`NotOwner`**. That's
  the custody guarantee, live.

### Addresses

The deterministic fresh-anvil addresses are baked into the `A` config in `index.html`. If you change
the deploy order (or don't restart anvil fresh), update `A` with the addresses the deploy script prints.

### Safety

Uses anvil's **well-known dev private keys** — local only, never use them anywhere real.
