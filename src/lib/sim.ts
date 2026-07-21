"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ActivityEntry, Preference, SimPosition } from "./types";

/**
 * State mô phỏng Phase 0, lưu localStorage: preference, vị thế "đã deploy",
 * mốc thời gian bắt đầu sinh lãi, lãi đã harvest, lịch sử.
 * Khi contracts lên chain: đọc on-chain thật — file này bỏ đi.
 */

interface SimState {
  preference: Preference | null;
  positions: SimPosition[];
  earnSince: number | null; // mốc tính lãi hiện tại (reset khi harvest)
  harvestedWei: string; // lãi đã harvest (base units), cộng vào tổng hiển thị
  sandboxWei: string; // tiền nạp qua cổng fiat ở DEV MODE (sim, không rút thật được)
  activity: ActivityEntry[];
}

const KEY = "cryptopiggy.sim.v2";
const EMPTY: SimState = {
  preference: null,
  positions: [],
  earnSince: null,
  harvestedWei: "0",
  sandboxWei: "0",
  activity: [],
};

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
// Phase 0 demo: real APY moves cents per year — too slow to feel. Accelerate the
// accrual clock so the balance visibly climbs during a session. Display + harvest
// both use this, so they stay consistent. (Stated APY labels stay honest.)
const DEMO_SPEED = 8000;

function usd(base: bigint): string {
  return `$${(Number(base) / 1e6).toFixed(2)}`;
}

let cache: SimState | null = null;
const listeners = new Set<() => void>();

function read(): SimState {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    cache = { ...EMPTY, ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function write(next: SimState) {
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSim() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);

  const setPreference = useCallback((preference: Preference | null) => {
    write({ ...read(), preference });
  }, []);

  const addActivity = useCallback((entry: ActivityEntry) => {
    const s = read();
    write({ ...s, activity: [entry, ...s.activity].slice(0, 100) });
  }, []);

  // Resting → Earning: đưa thêm tiền rảnh vào làm việc.
  const earnMore = useCallback((positions: SimPosition[], summary: string) => {
    const s = read();
    const now = Date.now();
    // Khóa lãi đã cộng dồn lại trước khi đổi vốn (để nó không bị tính lại/tụt lùi).
    const harvestedWei = (
      BigInt(s.harvestedWei) + accruedWei(s.positions, s.earnSince, now)
    ).toString();

    const merged = s.positions.map((p) => ({ ...p }));
    for (const p of positions) {
      const existing = merged.find((m) => m.key === p.key);
      if (existing) {
        existing.amountWei = (
          BigInt(existing.amountWei) + BigInt(p.amountWei)
        ).toString();
      } else {
        merged.push({ ...p });
      }
    }
    write({
      ...s,
      positions: merged,
      harvestedWei,
      earnSince: now,
      activity: [
        { ts: now, type: "earn" as const, summary, simulated: true },
        ...s.activity,
      ].slice(0, 100),
    });
  }, []);

  // Earning → Resting: rút vốn (theo tỉ lệ) khỏi các kênh về ví, để rút ra ngoài.
  // Bước thủ công, tách riêng — pool có thể không trả tức thì (đây là chỗ có độ trễ).
  const exitToWallet = useCallback((amountWei: bigint) => {
    const s = read();
    const now = Date.now();
    const harvestedWei = (
      BigInt(s.harvestedWei) + accruedWei(s.positions, s.earnSince, now)
    ).toString();

    const deployed = s.positions.reduce((a, p) => a + BigInt(p.amountWei), 0n);
    if (deployed === 0n) return;
    const cut = amountWei >= deployed ? deployed : amountWei;
    const remaining = deployed - cut;
    const positions =
      remaining === 0n
        ? []
        : s.positions
            .map((p) => ({
              ...p,
              amountWei: ((BigInt(p.amountWei) * remaining) / deployed).toString(),
            }))
            .filter((p) => BigInt(p.amountWei) > 0n);

    write({
      ...s,
      positions,
      harvestedWei,
      earnSince: positions.length ? now : null,
      activity: [
        { ts: now, type: "exit" as const, summary: `Closed ${usd(cut)} to wallet`, simulated: true },
        ...s.activity,
      ].slice(0, 100),
    });
  }, []);

  // DEV MODE: mô phỏng nạp fiat qua cổng thứ ba (thẻ/PayPal) — cộng vào ví sandbox.
  const devDeposit = useCallback((amountWei: bigint) => {
    const s = read();
    write({
      ...s,
      sandboxWei: (BigInt(s.sandboxWei) + amountWei).toString(),
      activity: [
        { ts: Date.now(), type: "onramp" as const, summary: `Added ${usd(amountWei)} via card (sandbox)`, simulated: true },
        ...s.activity,
      ].slice(0, 100),
    });
  }, []);

  // Harvest: collect accrued interest to the wallet. Free — the fee is on deposits, never on harvest.
  const harvest = useCallback((): { net: bigint } => {
    const s = read();
    const now = Date.now();
    const net = accruedWei(s.positions, s.earnSince, now);
    if (net === 0n) return { net: 0n };
    write({
      ...s,
      harvestedWei: (BigInt(s.harvestedWei) + net).toString(),
      earnSince: now,
      activity: [
        {
          ts: now,
          type: "harvest" as const,
          summary: `Harvested $${(Number(net) / 1e6).toFixed(4)}`,
          simulated: true,
        },
        ...s.activity,
      ].slice(0, 100),
    });
    return { net };
  }, []);

  const reset = useCallback(() => write(EMPTY), []);

  return { ...state, setPreference, addActivity, earnMore, exitToWallet, harvest, devDeposit, reset };
}

/** Tổng đã "deploy" (mô phỏng), để trừ khỏi idle hiển thị. */
export function deployedTotalWei(positions: SimPosition[]): bigint {
  return positions.reduce((acc, p) => acc + BigInt(p.amountWei), 0n);
}

/** Lãi cộng dồn (base units) từ earnSince tới now, theo APY từng vị thế. */
export function accruedWei(
  positions: SimPosition[],
  earnSince: number | null,
  now: number,
): bigint {
  if (!earnSince || positions.length === 0) return 0n;
  const years = ((now - earnSince) / YEAR_MS) * DEMO_SPEED;
  if (years <= 0) return 0n;
  let total = 0n;
  for (const p of positions) {
    const principal = Number(BigInt(p.amountWei));
    const gain = principal * ((p.apy ?? 0) / 100) * years;
    total += BigInt(Math.floor(gain));
  }
  return total;
}
