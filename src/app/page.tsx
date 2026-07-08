"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Piggy } from "@/components/piggy";
import { Button } from "@/components/button";

export default function Landing() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.replace("/app");
  }, [ready, authenticated, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="animate-fade-rise">
        <Piggy className="w-40" />
      </div>
      <h1 className="animate-fade-rise text-3xl font-semibold tracking-tight [animation-delay:60ms]">
        A piggy bank for crypto
      </h1>
      <p className="animate-fade-rise text-muted [animation-delay:120ms]">
        Drop money in. Watch it grow.
      </p>
      <Button
        full
        size="lg"
        onClick={login}
        disabled={!ready}
        className="animate-fade-rise [animation-delay:180ms]"
      >
        Get started
      </Button>
    </main>
  );
}
