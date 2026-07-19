"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { DEV_WALLET } from "@/lib/piggy";
import { TermsGate } from "@/components/terms-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  // Logged-out visitors to /app go back to the "Get started" onboarding at / (one source of truth).
  useEffect(() => {
    if (DEV_WALLET) return; // local anvil demo — no login (mock wallet)
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (DEV_WALLET) return <TermsGate>{children}</TermsGate>; // local anvil demo — no login (mock wallet)

  if (!ready || !authenticated) {
    return <main className="flex flex-1 items-center justify-center text-muted">Loading…</main>;
  }

  // First-run Terms acceptance gates the app: nothing is usable until the user accepts.
  return <TermsGate>{children}</TermsGate>;
}
