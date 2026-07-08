"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();

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
