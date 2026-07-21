"use client";

import { useEffect, useState } from "react";
import type { Strategy } from "@/lib/api";

// Landing marketing stats always want live numbers — prefer the app's configured API, else the known
// production backend. Public, keyless: /market/strategies over real Base market data.
const STATS_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://cryptopiggy-backend-production.ai-suggestion.workers.dev";

type Stats = { bestYield: string; venues: number; expected: string };

// Sensible static fallback so the strip never looks broken if the API is briefly unreachable.
const FALLBACK: Stats = { bestYield: "4.3", venues: 8, expected: "5.3" };

function derive(strategies: Strategy[]): Stats {
  const venueKeys = new Set<string>();
  let bestYieldBps = 0;
  for (const s of strategies) {
    for (const m of s.mix) {
      venueKeys.add(m.key);
      if (m.class === "savings" && m.apyBps > bestYieldBps) bestYieldBps = m.apyBps;
    }
  }
  const balanced = strategies.find((s) => s.id === "balanced") ?? strategies[0];
  return {
    bestYield: (bestYieldBps / 100).toFixed(1),
    venues: venueKeys.size || FALLBACK.venues,
    expected: balanced ? (balanced.expectedReturnBps / 100).toFixed(1) : FALLBACK.expected,
  };
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${STATS_URL}/market/strategies?term=1y`)
      .then((r) => r.json())
      .then((d: { strategies?: Strategy[] }) => {
        if (!alive) return;
        if (d.strategies?.length) {
          setStats(derive(d.strategies));
          setLive(true);
        } else {
          setStats(FALLBACK);
        }
      })
      .catch(() => {
        if (alive) setStats(FALLBACK);
      });
    return () => {
      alive = false;
    };
  }, []);

  const s = stats ?? FALLBACK;
  const items = [
    { value: `${s.venues}`, label: "Protocols analyzed & risk-scored" },
    { value: `${s.bestYield}%`, label: "Best yield tracked, per year" },
    { value: `${s.expected}%`, label: "Typical expected return" },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted">
        <span
          className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse-dot bg-accent" : "bg-line"}`}
        />
        {live ? "Live from the market, right now" : "Market snapshot"}
      </div>
      <dl className="grid grid-cols-3 gap-3 sm:gap-6">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-2xl border border-line bg-card px-3 py-5 text-center sm:px-5"
          >
            <dt className="text-2xl font-semibold tracking-tight tabular-nums text-accent sm:text-3xl">
              {it.value}
            </dt>
            <dd className="mx-auto mt-1.5 max-w-[9rem] text-xs leading-snug text-muted sm:text-sm">
              {it.label}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
