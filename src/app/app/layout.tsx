"use client";

import { usePrivy } from "@privy-io/react-auth";
import { DEV_WALLET } from "@/lib/piggy";
import { TermsGate } from "@/components/terms-gate";
import { AppShell } from "@/components/shell";
import { AppStart } from "@/components/app-start";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();

  let inner: React.ReactNode;
  if (DEV_WALLET || (ready && authenticated)) {
    // First-run Terms acceptance gates the app: nothing is usable until the user accepts.
    inner = <TermsGate>{children}</TermsGate>;
  } else if (!ready) {
    inner = <main className="flex flex-1 items-center justify-center text-muted">Loading…</main>;
  } else {
    // Signed out — the app shows its OWN start screen (sign-in lives here, not on the landing).
    inner = <AppStart />;
  }

  // The app lives in a phone-width column with a surround — the landing (/) is full-width and free of it.
  return (
    <div className="flex min-h-dvh justify-center bg-[#f0e2e6]">
      <AppShell>{inner}</AppShell>
    </div>
  );
}
