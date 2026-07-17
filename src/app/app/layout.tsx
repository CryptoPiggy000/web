"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/button";
import { DEV_WALLET } from "@/lib/piggy";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();

  if (DEV_WALLET) return <>{children}</>; // local anvil demo — no login (mock wallet)

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted">Loading…</main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">Sign in to open your piggy.</p>
        <Button size="lg" onClick={login}>
          Sign in
        </Button>
      </main>
    );
  }

  return <>{children}</>;
}
