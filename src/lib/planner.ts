import type { Plan, PlanAction, Preference, RiskTolerance, TargetSlice } from "./types";

/**
 * Planner client. Phase 0: mock chạy phía client, cùng interface với backend tương lai
 * (POST /plans/preview). Khi backend sẵn sàng chỉ thay thân hàm này bằng fetch.
 */

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const ZERO32 = ("0x" + "0".repeat(64)) as `0x${string}`;

interface MixDef {
  slices: TargetSlice[];
  reasoning: string;
  goal: string;
}

// Tất cả bằng USDC (đô-la), không biến động giá — khác nhau chỉ ở nguồn lãi.
// Lãi cao hơn = giao thức mới hơn, ít "dày dạn" hơn (rủi ro smart-contract, không phải rủi ro giá).
const MIXES: Record<Preference["riskTolerance"], MixDef> = {
  khong: {
    goal: "Steady and proven",
    reasoning:
      "All of it goes into Aave, one of the most battle-tested lending markets. Lowest rate, highest peace of mind.",
    slices: [{ key: "aave", name: "Aave lending", percent: 100, apy: 2.8 }],
  },
  "mot-chut": {
    goal: "A balanced blend",
    reasoning:
      "Split evenly between Aave lending and a stable-yield vault, for a middle-of-the-road rate.",
    slices: [
      { key: "aave", name: "Aave lending", percent: 50, apy: 2.8 },
      { key: "vault", name: "Stable-yield vault", percent: 50, apy: 4.1 },
    ],
  },
  "thoai-mai": {
    goal: "Chase the higher rate",
    reasoning:
      "All of it goes into the higher-yielding stable vault. Best rate, on a newer protocol.",
    slices: [{ key: "vault", name: "Stable-yield vault", percent: 100, apy: 4.1 }],
  },
};

function fmtUsd(base: bigint) {
  const n = Number(base) / 1e6;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tóm tắt một lựa chọn để user so sánh. Vì tất cả là USDC nên chỉ còn một
 * con số duy nhất cần cân nhắc: lãi/năm (blended APY). Không còn "market exposure".
 */
export function optionSummary(risk: RiskTolerance) {
  const slices = MIXES[risk].slices;
  const yieldApy = slices.reduce((a, s) => a + (s.apy ?? 0) * s.percent, 0) / 100;
  return { slices, yieldApy };
}

export async function previewPlan(
  idleWei: bigint,
  preference: Preference,
): Promise<Plan> {
  // Giả lập độ trễ mạng để UI xử lý đúng trạng thái loading từ bây giờ
  await new Promise((r) => setTimeout(r, 600));

  const mix = MIXES[preference.riskTolerance];
  const actions: PlanAction[] = mix.slices.map((s) => {
    const amount = (idleWei * BigInt(s.percent)) / 100n;
    return {
      kind: 0,
      positionId: ZERO32,
      assetIn: ZERO,
      assetOut: ZERO,
      router: ZERO,
      amount,
      minOut: 0n,
      routeData: "0x",
      label: `Put ${fmtUsd(amount)} into ${s.name} (≈${s.apy}%/yr)`,
    } satisfies PlanAction;
  });

  return {
    planId: `mock-${idleWei.toString(36)}-${preference.riskTolerance}`,
    goal: mix.goal,
    reasoning: mix.reasoning,
    targetMix: mix.slices,
    actions,
    estCost: "Free, network fee covered by CryptoPiggy",
    expiresAt: Date.now() + 5 * 60_000,
  };
}
