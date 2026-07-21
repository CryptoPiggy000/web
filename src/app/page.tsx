"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Piggy } from "@/components/piggy";
import { Button } from "@/components/button";
import { LiveStats } from "@/components/live-stats";
import { IconShield, IconTrendUp, IconSparkle } from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Add money",
    body: "Top up with a card or send USDC. No exchange account, no seed phrase to memorize.",
  },
  {
    n: "02",
    title: "Pick your comfort",
    body: "Safe, Balanced, or Bold. We suggest a mix; you decide and sign it yourself.",
  },
  {
    n: "03",
    title: "Watch it grow",
    body: "Your money earns real yield across trusted protocols. Take it out whenever you like.",
  },
];

const TRUST = [
  {
    icon: <IconShield />,
    title: "Non-custodial by design",
    body: "Funds live in your own wallet. We can never move, freeze, or lose them — only you sign.",
  },
  {
    icon: <IconTrendUp />,
    title: "Real market intelligence",
    body: "An engine tracks live yields across Base and suggests where your money works hardest.",
  },
  {
    icon: <IconSparkle />,
    title: "No gas, no jargon",
    body: "Transactions are sponsored, so you never buy gas. The crypto plumbing stays out of sight.",
  },
];

export default function Landing() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  const launch = () => {
    if (authenticated) router.push("/app");
    else login();
  };

  useEffect(() => {
    // an already-signed-in visitor who lands on / gets taken straight in
    if (ready && authenticated) router.replace("/app");
  }, [ready, authenticated, router]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* ── top nav ── */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-accent">
              <Piggy className="w-7" />
            </span>
            CryptoPiggy
          </span>
          <Button size="sm" onClick={launch} disabled={!ready}>
            Launch app
          </Button>
        </nav>
      </header>

      {/* ── hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 pt-14 sm:px-8 md:grid-cols-2 md:gap-6 md:pb-16 md:pt-24">
        <div className="animate-fade-rise text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Savings, reimagined for crypto
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-[3.4rem]">
            A piggy bank
            <br />
            that actually grows.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted md:mx-0">
            Drop money in and it earns real yield across trusted protocols — safely, in a wallet only
            you control. No jargon, no gas, no stress.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Button size="lg" onClick={launch} disabled={!ready} className="w-full sm:w-auto">
              Start saving
            </Button>
            <a
              href="#how"
              className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">Free to start · Email or Google · Withdraw anytime</p>
        </div>

        {/* illustration */}
        <div className="animate-fade-rise relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center [animation-delay:120ms]">
          <div className="absolute inset-6 rounded-full bg-accent/5" />
          <div className="absolute inset-14 rounded-full bg-accent/5" />
          <div className="animate-piggy-breathe relative">
            <Piggy className="w-64 drop-shadow-sm sm:w-72" />
          </div>
          {/* floating coins */}
          <Coin className="left-6 top-10 [animation-delay:0ms]" label="$" />
          <Coin className="right-8 top-20 [animation-delay:900ms]" label="$" />
          <Coin className="bottom-12 left-12 [animation-delay:1800ms]" label="$" />
        </div>
      </section>

      {/* ── live stats ── */}
      <section className="border-y border-line bg-card/60">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
          <LiveStats />
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps. That&apos;s the whole thing.
          </h2>
        </div>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((s) => (
            <li key={s.n} className="relative">
              <span className="font-mono text-sm font-semibold text-accent/60">{s.n}</span>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── trust / security ── */}
      <section className="border-t border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Built to be trusted
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your money never leaves your hands.
            </h2>
          </div>
          <div className="mt-10 grid gap-x-6 gap-y-9 sm:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-[19px] text-accent">
                  {t.icon}
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── closing CTA ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <div className="mx-auto mb-6 w-fit text-accent">
          <Piggy className="w-20" />
        </div>
        <h2 className="mx-auto max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          Start with as little as you like.
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-muted">
          It takes a minute to open your piggy. Your future self says thanks.
        </p>
        <Button size="lg" onClick={launch} disabled={!ready} className="mt-8">
          Open my piggy
        </Button>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:px-8">
          <span className="flex items-center gap-2">
            <span className="text-accent">
              <Piggy className="w-5" />
            </span>
            <span className="font-medium text-ink">CryptoPiggy</span>
            <span className="text-muted">— a piggy bank for crypto</span>
          </span>
          <div className="flex items-center gap-5">
            <a href="/terms" className="hover:text-ink">
              Terms
            </a>
            <a href="/privacy" className="hover:text-ink">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Coin({ className, label }: { className?: string; label: string }) {
  return (
    <div aria-hidden className={`animate-coin-float absolute ${className ?? ""}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink shadow-md ring-2 ring-paper">
        {label}
      </div>
    </div>
  );
}
