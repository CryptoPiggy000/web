"use client";

import { useRouter } from "next/navigation";
import { Piggy } from "@/components/piggy";
import { Button } from "@/components/button";
import { LiveStats } from "@/components/live-stats";
import { AnimaField } from "@/components/anima-field";
import { Reveal, useInView } from "@/components/motion";
import { IconShield, IconTrendUp, IconSparkle, IconCard } from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Set your comfort",
    body: "Pick Safe, Balanced, or Bold. That's the only call you have to make.",
  },
  {
    n: "02",
    title: "See the plan",
    body: "We show you where your money would go, and why. Approve it with a tap; nothing moves until you do.",
  },
  {
    n: "03",
    title: "It works, you relax",
    body: "It earns from day one. Adjust the mix or cash out any time — nothing is locked up.",
  },
];

const ENGINE = [
  {
    icon: <IconSparkle />,
    title: "Weighs risk against reward",
    body: "Each option gets two scores: what it can earn, and what it can lose. A fat APY doesn't win if the risk is worse.",
  },
  {
    icon: <IconTrendUp />,
    title: "Watches the market all day",
    body: "Rates on Aave, Morpho and the rest move constantly. It re-checks them around the clock so your plan never goes stale.",
  },
  {
    icon: <IconShield />,
    title: "Suggests, never seizes",
    body: "It can only propose. You approve every move, and your money never leaves your wallet.",
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
  const launch = () => router.push("/app");

  return (
    <div className="theme-dark min-h-dvh bg-paper text-ink">
      {/* ── hero: a dark living particle field ── */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0b0613] text-[#f6eef3]">
        <AnimaField className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        {/* vignette + a soft pink core glow behind the field */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_38%,transparent_38%,rgba(5,2,12,0.74))]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(52%_42%_at_50%_46%,rgba(255,61,127,0.18),transparent_62%)]" />

        {/* nav (over the dark stage) */}
        <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <Piggy className="w-7" />
            Crypto<span className="text-accent">Piggy</span>
          </span>
          <Button size="md" onClick={launch}>
            Launch app
          </Button>
        </nav>

        {/* spec rail (desktop) */}
        <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 text-right font-mono text-[10.5px] uppercase leading-[2.4] tracking-[0.18em] text-white/45 sm:right-8 lg:block">
          Living plan<br />Cursor-reactive<br />Idle · Earning · Growth<br />Non-custodial<br />—<br />Built 2026
        </div>

        {/* core — anchored lower-left, editorial */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-[clamp(2.5rem,10vh,6rem)] sm:px-8">
          <span className="animate-rise inline-flex w-fit items-center gap-3 font-mono text-[11px] uppercase tracking-[0.26em] text-white/55">
            <span className="h-px w-8 bg-white/25" />
            Your money, quietly at work
          </span>
          <h1
            className="animate-rise mt-6 max-w-[15ch] text-balance text-[clamp(2.8rem,9vw,6.4rem)] font-semibold leading-[0.96] tracking-tight"
            style={{ animationDelay: "140ms" }}
          >
            Your idle money,{" "}
            <em className="bg-gradient-to-r from-accent via-[#c77dff] to-[#ff9e6a] bg-clip-text not-italic text-transparent">
              working
            </em>{" "}
            for you.
          </h1>
          <div
            className="animate-rise mt-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"
            style={{ animationDelay: "300ms" }}
          >
            <p className="max-w-[38ch] text-lg leading-relaxed text-[#f6eef3]/70">
              It grows on its own — and never leaves your wallet.
            </p>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={launch}>
                Start growing
              </Button>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-[#f6eef3] backdrop-blur transition-colors hover:border-white/40 hover:bg-white/10"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>

        {/* hint */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45 md:flex">
          <span className="animate-ring-pulse h-3.5 w-3.5 rounded-full border border-white/40" />
          move to stir it
        </div>
      </section>

      {/* ── live stats ── */}
      <section className="border-y border-line bg-card/60">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
          <Reveal>
            <LiveStats />
          </Reveal>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A managed plan, without the middleman fees.
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 110} className="relative">
              <span className="font-mono text-sm font-semibold text-accent/60">{s.n}</span>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── the engine (intelligence) ── */}
      <section className="border-t border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">The engine</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                It reads the market so you don&apos;t have to.
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                Most apps just show you the biggest number. Ours weighs what each option can earn
                against what it can lose, then builds a plan around how bold you want to be.
              </p>
              <RiskSpectrum />
            </Reveal>

            <ul className="flex flex-col gap-7">
              {ENGINE.map((e, i) => (
                <Reveal as="li" key={e.title} delay={i * 120} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-[19px] text-accent">
                    {e.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{e.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{e.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── trust / security ── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <Reveal className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Built to be trusted
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your money never leaves your hands.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-x-6 gap-y-9 sm:grid-cols-3">
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={i * 110}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-[19px] text-accent">
                  {t.icon}
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── closing CTA ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <div className="mx-auto mb-6 w-fit">
            <div className="animate-piggy-breathe">
              <Piggy className="w-20" />
            </div>
          </div>
          <h2 className="mx-auto max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            Start with as little as you like.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-muted">
            Opening your piggy takes about a minute. Start with ten dollars if you like.
          </p>
          <Button size="lg" onClick={launch} className="mt-8">
            Open my piggy
          </Button>
        </Reveal>
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

function RiskSpectrum() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="mt-8 max-w-sm rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Safe</span>
        <span>Balanced</span>
        <span>Bold</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-line">
        <span
          className={`spectrum-dot absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent shadow ${inView ? "in" : ""}`}
        />
      </div>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line">
        <span className={`spectrum-fill flex ${inView ? "in" : ""}`} style={{ width: "100%" }}>
          <span className="bg-good" style={{ width: "70%" }} />
          <span className="bg-crypto" style={{ width: "30%" }} />
        </span>
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>70% savings</span>
        <span>30% growth</span>
      </div>
    </div>
  );
}
