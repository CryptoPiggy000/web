// Client for the backend MARKET endpoints (web/API.md): strategy suggestions, plan detail, and swap
// quotes. Active only when NEXT_PUBLIC_API_URL is set; otherwise the app runs the Phase-0 client sim.
// All public reads — no session/auth here: on-chain execution is built + signed client-side (useChainView),
// and the Portfolio reads the public ops indexer directly, so the backend never authenticates the user.
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const API_MODE = Boolean(API_URL);

async function req<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } }).error;
    throw new Error(e?.message ?? `HTTP ${res.status}`);
  }
  return json as T;
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
  // The 3 suggested strategies (risk presets) for the chooser, conditioned on ?term.
  strategies: (term = "1y") =>
    req<{ strategies: Strategy[] }>(`/market/strategies?term=${term}`),
  // The full plan for a chosen strategy/risk + amount — the "View plan" detail (allocation + actions).
  plan: (body: { strategy?: string; risk?: number; amount?: string; term?: string; holdings?: unknown }) =>
    req<PlanDetail>("/market/plan", { method: "POST", body }),
  // Best DEX-aggregator swap quote (0x + KyberSwap, best fill) for a held-asset buy/sell. Approve-and-call:
  // the client drops `router`/`routeData`/`minOut` straight into a SWAP Action; the account enforces minOut.
  quote: (body: { sellToken: string; buyToken: string; sellAmount: string; taker: string; slippageBps?: number; chainId?: number }) =>
    req<SwapQuote>("/market/quote", { method: "POST", body }),
};
