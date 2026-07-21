"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { DEV_WALLET } from "@/lib/piggy";
import { TermsGate } from "@/components/terms-gate";
import { AppShell } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  // Logged-out visitors to /app go back to the landing at / (one source of truth).
  useEffect(() => {
    if (DEV_WALLET) return; // local anvil demo — no login (mock wallet)
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  const inner =
    DEV_WALLET || (ready && authenticated) ? (
      // First-run Terms acceptance gates the app: nothing is usable until the user accepts.
      <TermsGate>{children}</TermsGate>
    ) : (
      <main className="flex flex-1 items-center justify-center text-muted">Loading…</main>
    );

  // The app lives in a phone-width column with a surround — the landing (/) is full-width and free of it.
  return (
    <div className="flex min-h-dvh justify-center bg-[#f0e2e6]">
      <AppShell>{inner}</AppShell>
    </div>
  );
}
