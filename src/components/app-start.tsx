"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Piggy } from "./piggy";
import { Button } from "./button";

/**
 * The app's own start screen — shown at /app when nobody's signed in. Sign-in lives HERE, inside the
 * app, not as a modal thrown over the marketing landing. "Launch app" just navigates here.
 */
export function AppStart() {
  const { login } = usePrivy();

  return (
    <main className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="animate-piggy-breathe">
          <Piggy className="w-40" />
        </div>
        <h1 className="animate-fade-rise mt-7 text-2xl font-semibold tracking-tight">
          Open your piggy
        </h1>
        <p className="animate-fade-rise mt-2 max-w-xs text-muted [animation-delay:60ms]">
          Sign in to start growing your money — email or Google, no seed phrase, a few seconds.
        </p>
      </div>

      <div className="animate-fade-rise [animation-delay:120ms]">
        <Button full size="lg" onClick={login}>
          Sign in
        </Button>
        <Link
          href="/"
          className="mt-3 block text-center text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
