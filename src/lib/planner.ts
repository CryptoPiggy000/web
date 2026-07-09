import type { Preference, RiskTolerance, TargetSlice } from "./types";

/**
 * Earn strategies. Phase 0: static client data used for the chooser preview; it mirrors
 * the backend `GET /market/strategies`. The actual deploy goes through the data layer
 * (sim: earnMore / API: POST /operations/earn) — see src/lib/piggy.ts.
 */

interface MixDef {
  slices: TargetSlice[];
}

// Tất cả bằng USDC (đô-la), không biến động giá — khác nhau chỉ ở nguồn lãi.
// Lãi cao hơn = giao thức mới hơn, ít "dày dạn" hơn (rủi ro smart-contract, không phải rủi ro giá).
const MIXES: Record<Preference["riskTolerance"], MixDef> = {
  khong: { slices: [{ key: "aave", name: "Aave lending", percent: 100, apy: 2.8 }] },
  "mot-chut": {
    slices: [
      { key: "aave", name: "Aave lending", percent: 50, apy: 2.8 },
      { key: "vault", name: "Stable-yield vault", percent: 50, apy: 4.1 },
    ],
  },
  "thoai-mai": { slices: [{ key: "vault", name: "Stable-yield vault", percent: 100, apy: 4.1 }] },
};

/**
 * Tóm tắt một lựa chọn để user so sánh. Vì tất cả là USDC nên chỉ còn một
 * con số duy nhất cần cân nhắc: lãi/năm (blended APY). Không còn "market exposure".
 */
export function optionSummary(risk: RiskTolerance) {
  const slices = MIXES[risk].slices;
  const yieldApy = slices.reduce((a, s) => a + (s.apy ?? 0) * s.percent, 0) / 100;
  return { slices, yieldApy };
}
