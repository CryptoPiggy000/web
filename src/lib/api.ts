// Client for the backend (web/API.md). Active only when NEXT_PUBLIC_API_URL is set;
// otherwise the app runs the Phase-0 client sim. Session is kept module-level (single user).
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const API_MODE = Boolean(API_URL);

let session: string | null = null;

async function req<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; idem?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session) headers["authorization"] = `Bearer ${session}`;
  if (opts.idem) headers["idempotency-key"] = opts.idem;
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } }).error;
    throw new Error(e?.message ?? `HTTP ${res.status}`);
  }
  return json as T;
}

export interface Money {
  base: string;
  usd?: string;
}
export interface Portfolio {
  total: Money;
  resting: Money & { pendingBase?: string };
  earning: Money;
  principal: Money;
  accrued: Money;
  apyBps: number;
  positions: { key: string; name: string; base: string; apyBps: number }[];
}
export interface BuiltOp {
  operationId: string;
  expiresAt: number;
  preview: Record<string, unknown>;
  toSign: { type: string; value: string };
}

// The engine's suggested allocations (v2, crypto-inclusive). A strategy is a savings/crypto mix with a
// steady yield + an expected return and a downside/upside RANGE over the term — not just an APY.
export interface StrategyMix {
  key: string;
  symbol: string;
  name: string;
  class: "savings" | "crypto";
  pct: number;
  apyBps: number;
  expectedReturnBps: number;
  downsideBps: number;
  upsideBps: number;
}
export interface Strategy {
  id: string;
  label: string;
  risk: number;
  term: string;
  savingsPct: number;
  cryptoPct: number;
  apyBps: number; // steady savings yield
  expectedReturnBps: number; // overall, over the term
  downsideBps: number;
  upsideBps: number;
  mix: StrategyMix[];
}
export interface PlanAction {
  kind: 0 | 1 | 2; // DEPOSIT | WITHDRAW | SWAP
  positionId: string;
  assetIn: string;
  assetOut: string;
  router: string;
  amount: string;
  minOut: string;
  routeData: string;
}
export interface SwapQuote {
  provider: string; // which aggregator won (0x | kyberswap)
  router: string; // approve + call target
  routeData: string; // opaque calldata to relay
  minOut: string; // minimum received (wei)
  buyAmount: string; // expected output (wei)
  quotedBy?: { provider: string; buyAmount: string }[]; // every provider's quote (transparency)
}
export interface PlanDetail {
  allocation: {
    position_id: string;
    symbol: string;
    class: "savings" | "crypto";
    pct: number;
    apy_bps: number;
    expected_return_bps: number;
    downside_bps: number;
    upside_bps: number;
  }[];
  actions: PlanAction[];
  summary: {
    term: string;
    savingsPct: number;
    cryptoPct: number;
    blendedYieldBps: number;
    cryptoExpectedBps: number;
    cryptoDownsideBps: number;
    cryptoUpsideBps: number;
  };
  reasoning: string;
}

export const api = {
  async verify(privyToken: string) {
    const r = await req<{ session: string; user: { id: string; owner: string; piggy: string } }>(
      "/auth/verify",
      { method: "POST", body: { privyToken } },
    );
    session = r.session;
    return r;
  },
  portfolio: () => req<Portfolio>("/me/portfolio"),
  strategies: (term = "1y") =>
    req<{ strategies: Strategy[] }>(`/market/strategies?term=${term}`),
  // The full plan for a chosen strategy/risk + amount — the View-plan detail (allocation + actions).
  plan: (body: { strategy?: string; risk?: number; amount?: string; term?: string; holdings?: unknown }) =>
    req<PlanDetail>("/market/plan", { method: "POST", body }),
  // Best DEX-aggregator swap quote (0x + KyberSwap, best fill) for a held-asset buy/sell. Approve-and-call:
  // the client drops `router`/`routeData`/`minOut` straight into a SWAP Action; the account enforces minOut.
  quote: (body: { sellToken: string; buyToken: string; sellAmount: string; taker: string; slippageBps?: number; chainId?: number }) =>
    req<SwapQuote>("/market/quote", { method: "POST", body }),
  activity: () =>
    req<{ items: { id: string; ts: number; type: string; summary: string; txHash?: string }[] }>(
      "/me/activity",
    ),

  buildEarn: (amount: string, strategy: string) =>
    req<BuiltOp>("/operations/earn", { method: "POST", body: { amount, strategy } }),
  buildHarvest: () => req<BuiltOp>("/operations/harvest", { method: "POST", body: {} }),
  buildExit: (amount: string) =>
    req<BuiltOp>("/operations/exit", { method: "POST", body: { amount } }),
  buildWithdraw: (to: string, amount: string) =>
    req<BuiltOp>("/operations/withdraw", { method: "POST", body: { to, amount } }),
  submit: (id: string, signature: string) =>
    req<{ status: string; txHash: string }>(`/operations/${id}/submit`, {
      method: "POST",
      body: { signature },
      idem: id,
    }),

  onramp: (amountUsd: string) =>
    req<{ sessionId: string; checkoutUrl: string }>("/onramp/session", {
      method: "POST",
      body: { amountUsd, method: "card" },
    }),
};

/** Build → sign → submit, one call. Mock ignores the signature; real signing wires here later. */
export async function runOp(build: Promise<BuiltOp>): Promise<{ txHash: string }> {
  const op = await build;
  // TODO(prod): sign op.toSign.value with the Privy embedded wallet before submit.
  const signature = "0x";
  return api.submit(op.operationId, signature);
}
