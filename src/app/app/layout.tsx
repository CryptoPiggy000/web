"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  // Logged-out visitors to /app go back to the "Get started" onboarding at / (one source of truth).
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return <main className="flex flex-1 items-center justify-center text-muted">Loading…</main>;
  }

  return <>{children}</>;
}
