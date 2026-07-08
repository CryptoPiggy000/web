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
  activity: ActivityEntry[];
}

const KEY = "cryptopiggy.sim.v2";
const EMPTY: SimState = {
  preference: null,
  positions: [],
  earnSince: null,
  harvestedWei: "0",
  activity: [],
};

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
// Phase 0 demo: real APY moves cents per year — too slow to feel. Accelerate the
// accrual clock so the balance visibly climbs during a session. Display + harvest
// both use this, so they stay consistent. (Stated APY labels stay honest.)
const DEMO_SPEED = 8000;

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

  const applyPlanSimulation = useCallback(
    (positions: SimPosition[], summary: string) => {
      const s = read();
      const merged = [...s.positions];
      for (const p of positions) {
        const existing = merged.find((m) => m.key === p.key);
        if (existing) {
          existing.amountWei = (
            BigInt(existing.amountWei) + BigInt(p.amountWei)
          ).toString();
        } else {
          merged.push(p);
        }
      }
      write({
        ...s,
        positions: merged,
        earnSince: s.earnSince ?? Date.now(),
        activity: [
          { ts: Date.now(), type: "plan" as const, summary, simulated: true },
          ...s.activity,
        ].slice(0, 100),
      });
    },
    [],
  );

  const harvest = useCallback(() => {
    const s = read();
    const now = Date.now();
    const gained = accruedWei(s.positions, s.earnSince, now);
    if (gained === 0n) return;
    write({
      ...s,
      harvestedWei: (BigInt(s.harvestedWei) + gained).toString(),
      earnSince: now,
      activity: [
        {
          ts: now,
          type: "plan" as const,
          summary: `Harvested $${(Number(gained) / 1e6).toFixed(4)}`,
          simulated: true,
        },
        ...s.activity,
      ].slice(0, 100),
    });
  }, []);

  const reset = useCallback(() => write(EMPTY), []);

  return { ...state, setPreference, addActivity, applyPlanSimulation, harvest, reset };
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

/** USDC/năm mà toàn bộ vị thế đang sinh ra (base units) — dùng cho ticker sống. */
export function yieldPerYearWei(positions: SimPosition[]): bigint {
  let total = 0n;
  for (const p of positions) {
    const principal = Number(BigInt(p.amountWei));
    total += BigInt(Math.floor(principal * ((p.apy ?? 0) / 100)));
  }
  return total;
}
