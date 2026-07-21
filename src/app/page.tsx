"use client";

import { useRouter } from "next/navigation";
import { Piggy } from "@/components/piggy";
import { Button } from "@/components/button";
import { LiveStats } from "@/components/live-stats";
import { IconShield, IconTrendUp, IconSparkle, IconCard } from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Set your comfort",
    body: "Tell us how much risk feels right — from Safe to Bold. No forms, no finance degree.",
  },
  {
    n: "02",
    title: "Get a tailored plan",
    body: "The engine spreads your money across the best risk-adjusted venues. You review it and sign — nothing moves without you.",
  },
  {
    n: "03",
    title: "It works, you relax",
    body: "Your money earns across trusted protocols. Adjust your mix or cash out whenever you like.",
  },
];

const ENGINE = [
  {
    icon: <IconSparkle />,
    title: "Risk and reward, both scored",
    body: "Every venue gets a risk score and a reward score, calibrated against the wider market — not just its headline APY.",
  },
  {
    icon: <IconTrendUp />,
    title: "Live, around the clock",
    body: "It tracks yields across Base — Aave, Morpho and more — and refreshes as the market moves.",
  },
  {
    icon: <IconShield />,
    title: "Suggests, never seizes",
    body: "It only proposes an allocation. You always review and sign; your funds never leave your wallet.",
  },
];

const TRUST = [
  {
    icon: <IconShield />,
    title: "Non-custodial by design",
    body: "Funds live in your own wallet. We can never move, freeze, or lose them — only you sign.",
  },
  {
    icon: <IconSparkle />,
    title: "No gas, no jargon",
    body: "Transactions are sponsored, so you never buy gas or memorize a seed phrase.",
  },
  {
    icon: <IconCard />,
    title: "Cash in and out, handled safely",
    body: "Adding or withdrawing cash goes through a licensed payment partner that runs the identity checks and card processing. We never see or store your card or ID.",
  },
];

export default function Landing() {
  const router = useRouter();

  // Pure marketing page — no auth here. Launch just enters the app; /app handles sign-in itself.
  const launch = () => router.push("/app");

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* ── top nav ── */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <Piggy className="w-7" />
            Crypto<span className="text-accent">Piggy</span>
          </span>
          <Button size="sm" onClick={launch}>
            Launch app
          </Button>
        </nav>
      </header>

      {/* ── hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 pt-14 sm:px-8 md:grid-cols-2 md:gap-6 md:pb-16 md:pt-24">
        <div className="animate-fade-rise text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            More than a savings app
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-[3.4rem]">
            Your idle money,
            <br />
            working for you.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted md:mx-0">
            CryptoPiggy puts your spare cash to work across trusted protocols — guided by a
            market-intelligence engine, in a wallet only you control. You choose the comfort level;
            it suggests the plan.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Button size="lg" onClick={launch} className="w-full sm:w-auto">
              Start growing
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
          <Coin className="left-6 top-10 [animation-delay:0ms]" />
          <Coin className="right-8 top-20 [animation-delay:900ms]" />
          <Coin className="bottom-12 left-12 [animation-delay:1800ms]" />
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
            A managed plan, without the middleman fees.
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

      {/* ── the engine (intelligence) ── */}
      <section className="border-t border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">The engine</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                A market-intelligence layer, working for your money.
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                Most apps just list the highest yield. Ours scores every venue on two things — how much
                it can earn and how much it can lose — then matches a plan to how much risk you&apos;re
                comfortable with.
              </p>
              {/* risk spectrum */}
              <div className="mt-8 max-w-sm rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Safe</span>
                  <span>Balanced</span>
                  <span>Bold</span>
                </div>
                <div className="relative mt-2 h-1.5 rounded-full bg-line">
                  <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent shadow" />
                </div>
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
                  <span className="bg-good" style={{ width: "70%" }} />
                  <span className="bg-crypto" style={{ width: "30%" }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted">
                  <span>70% savings</span>
                  <span>30% growth</span>
                </div>
              </div>
            </div>

            <ul className="flex flex-col gap-7">
              {ENGINE.map((e) => (
                <li key={e.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-[19px] text-accent">
                    {e.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{e.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{e.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── trust / security ── */}
      <section className="border-t border-line">
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
        <div className="mx-auto mb-6 w-fit">
          <Piggy className="w-20" />
        </div>
        <h2 className="mx-auto max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          Start with as little as you like.
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-muted">
          It takes a minute to open your piggy. Your future self says thanks.
        </p>
        <Button size="lg" onClick={launch} className="mt-8">
          Open my piggy
        </Button>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 text-sm text-muted sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="flex items-center gap-2">
              <Piggy className="w-5" />
              <span className="font-medium text-ink">CryptoPiggy</span>
              <span>— put your idle money to work</span>
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
          <p className="max-w-2xl text-xs leading-relaxed text-faint">
            CryptoPiggy is a non-custodial tool, not a financial adviser — nothing here is investment
            advice. Crypto is volatile and you can lose money; projected returns are estimates, not
            promises. Fiat cash-in and cash-out are provided by a licensed third-party payment partner.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Coin({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`animate-coin-float absolute ${className ?? ""}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink shadow-md ring-2 ring-paper">
        $
      </div>
    </div>
  );
}
