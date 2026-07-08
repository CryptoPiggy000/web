"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Piggy } from "./piggy";
import { HeroBalance } from "./hero-balance";

/**
 * The balance, framed in a card with the piggy as its background. Piggy and text
 * share the same box, so the number always sits centred in the piggy's belly.
 */
export function BalanceCard({
  compute,
  precision,
  status,
  bumpValue,
}: {
  compute: (now: number) => number;
  precision: number;
  status: ReactNode;
  bumpValue: number; // pop the piggy when this rises (a deposit landed)
}) {
  const piggyRef = useRef<HTMLDivElement>(null);
  const prev = useRef(bumpValue);
  useEffect(() => {
    if (bumpValue > prev.current && piggyRef.current) {
      const el = piggyRef.current;
      el.classList.remove("animate-piggy-pop");
      void el.offsetWidth;
      el.classList.add("animate-piggy-pop");
    }
    prev.current = bumpValue;
  }, [bumpValue]);

  return (
    <div className="relative w-full py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div ref={piggyRef} className="w-[132%] max-w-none">
          <Piggy className="w-full opacity-[0.18]" />
        </div>
      </div>

      <div className="relative flex flex-col items-center text-center">
        <p className="text-sm text-muted">Your balance</p>
        <HeroBalance
          compute={compute}
          precision={precision}
          className="mt-1 block text-[3.5rem] font-semibold leading-none tracking-tight tabular-nums"
        />
        <div className="mt-3 h-5 text-sm">{status}</div>
      </div>
    </div>
  );
}
