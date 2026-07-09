/**
 * Types dùng chung cho FE. Plan/Action bám theo API contract trong FLOW.md;
 * Action mirror struct trong contracts/src/Types.sol để sau này đưa thẳng vào executePlan.
 */

export type Goal = "tich-luy" | "lai-on-dinh" | "thu-cho-biet";
export type RiskTolerance = "khong" | "mot-chut" | "thoai-mai";
export type Horizon = "duoi-6-thang" | "6-24-thang" | "tren-2-nam";

export interface Preference {
  goal: Goal;
  riskTolerance: RiskTolerance;
  horizon: Horizon;
}

/** Mirror của enum ActionKind trong Types.sol */
export type ActionKind = 0 | 1 | 2; // DEPOSIT | WITHDRAW | SWAP

/** Mirror của struct Action trong Types.sol — backend sẽ trả đúng shape này. */
export interface PlanAction {
  kind: ActionKind;
  positionId: `0x${string}`;
  assetIn: `0x${string}`;
  assetOut: `0x${string}`;
  router: `0x${string}`;
  amount: bigint;
  minOut: bigint;
  routeData: `0x${string}`;
  /** FE-only: mô tả tiếng người cho màn preview */
  label: string;
}

export interface TargetSlice {
  key: string;
  name: string;
  percent: number;
  apy?: number; // %/năm, undefined = không sinh lãi
}

export interface Plan {
  planId: string;
  goal: string;
  reasoning: string;
  targetMix: TargetSlice[];
  actions: PlanAction[];
  estCost: string;
  expiresAt: number;
}

/** Vị thế mô phỏng Phase 0 (sẽ thay bằng đọc on-chain khi có contracts) */
export interface SimPosition {
  key: string;
  name: string;
  amountWei: string; // bigint serialize qua localStorage
  apy?: number;
}

// Khớp với API.md GET /me/activity type ∈ onramp|deposit|earn|harvest|exit|withdraw
export interface ActivityEntry {
  ts: number;
  type: "onramp" | "deposit" | "earn" | "harvest" | "exit" | "withdraw";
  summary: string;
  txHash?: string;
  simulated?: boolean;
}
