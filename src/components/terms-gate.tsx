"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";

// Bump this when the terms materially change — everyone re-accepts on their next visit.
const TERMS_VERSION = "2026-07-19";
const STORAGE_KEY = "cryptopiggy:terms";

/**
 * First-run acceptance gate. On the first visit (nothing accepted for the current TERMS_VERSION in
 * localStorage), a blocking modal covers the app until the user clicks Accept. Clicking Accept is the
 * affirmative consent (clickwrap) and records the accepted version so it never shows again — until the
 * version is bumped. Legal copy here + on /terms + /privacy is a starting point pending legal review.
 */
export function TermsGate({ children }: { children: React.ReactNode }) {
  // null until we've read storage (client-only) — avoids an SSR/hydration mismatch and a flash for
  // users who already accepted.
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAccepted(window.localStorage.getItem(STORAGE_KEY) === TERMS_VERSION);
    } catch {
      setAccepted(false); // storage blocked → show the gate to be safe
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, TERMS_VERSION);
    } catch {
      /* storage blocked — let them through this session anyway */
    }
    setAccepted(true);
  };

  return (
    <>
      {children}
      {accepted === false && (
        <div className="absolute inset-0 z-[100] flex flex-col justify-end">
          {/* backdrop captures all clicks, so nothing behind it is interactable */}
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            className="animate-fade-rise relative m-3 rounded-3xl border border-line bg-card p-6 shadow-xl"
          >
            <h2 id="terms-title" className="text-lg font-semibold">
              Before you start
            </h2>
            <p className="mt-2 text-sm text-muted">
              CryptoPiggy is non-custodial — your money stays in your own wallet, and only you can move
              it. A few things to agree to first:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                • This is <span className="font-medium text-ink">not investment advice</span> —
                suggestions are informational only.
              </li>
              <li>
                • Crypto is volatile: <span className="font-medium text-ink">you can lose money</span>.
                Projected returns are estimates, not promises.
              </li>
              <li>• You use the software as-is, at your own risk.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              By continuing you agree to our{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-ink">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-ink">
                Privacy Policy
              </a>
              .
            </p>
            <Button full size="lg" className="mt-5" onClick={accept}>
              Accept &amp; continue
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
