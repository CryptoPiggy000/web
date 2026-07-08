"use client";

import { useEffect, useRef, useState } from "react";

function fmt(n: number, precision: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

/**
 * A live dollar figure. `compute(now)` returns the true target for the current
 * wall-clock; the displayed number eases toward it every frame — so a deposit
 * counts up, and yield accrual makes it creep upward on its own. Writes straight
 * to the DOM (no re-render).
 */
export function HeroBalance({
  compute,
  precision = 2,
  className,
}: {
  compute: (now: number) => number;
  precision?: number;
  className?: string;
}) {
  const elRef = useRef<HTMLSpanElement>(null);
  const computeRef = useRef(compute);
  const precRef = useRef(precision);
  useEffect(() => {
    computeRef.current = compute;
    precRef.current = precision;
  });

  const [initial] = useState(() => fmt(compute(Date.now()), precision));

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let displayed = computeRef.current(Date.now());
    let last = performance.now();
    let lastText = "";
    let raf = 0;

    const loop = (pnow: number) => {
      const dt = Math.min(100, pnow - last);
      last = pnow;
      const target = computeRef.current(Date.now());
      const k = 1 - Math.pow(1 - 0.12, dt / 16.6667);
      displayed += (target - displayed) * k;
      if (Math.abs(target - displayed) < 5e-6) displayed = target;
      const text = fmt(displayed, precRef.current);
      if (text !== lastText) {
        el.textContent = text;
        lastText = text;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span ref={elRef} className={className}>
      {initial}
    </span>
  );
}
