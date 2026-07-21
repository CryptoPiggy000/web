"use client";

import { useState, useEffect } from "react";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { SheetSuccess } from "./sheet-success";
import { HeroBalance } from "./hero-balance";
import { IconPlus, IconTrendUp } from "./icons";
import { usePiggyView, STRATEGY_ID } from "@/lib/piggy";
import { optionSummary } from "@/lib/planner";
import { api, API_MODE, type Strategy, type PlanDetail } from "@/lib/api";
import { DEPOSIT_FEE_BPS } from "@/lib/chain";
import { fmtUsd } from "@/lib/format";
import type { RiskTolerance } from "@/lib/types";

const CHOICES: { value: RiskTolerance; label: string }[] = [
  { value: "khong", label: "Safe" },
  { value: "mot-chut", label: "Balanced" },
  { value: "thoai-mai", label: "Bold" },
];

// bps → signed % (e.g. -6234 → "−62%")
const pctBps = (b: number) => `${b >= 0 ? "+" : "−"}${Math.abs(Math.round(b / 100))}%`;

const BAR_TONE = ["bg-accent", "bg-accent/55", "bg-[#c8a08f]"];

export function GrowSheet({
  open,
  onClose,
  onAddMoney,
}: {
  open: boolean;
  onClose: () => void;
  onAddMoney: () => void;
}) {
  const view = usePiggyView();
  const restingWei = view.restingBase;
  const deployed = view.deployedBase;
  const canEarn = restingWei > 0n;
  const canExit = deployed > 0n;

  const [tab, setTab] = useState<"earn" | "positions">(canExit && !canEarn ? "positions" : "earn");
  const [picked, setPicked] = useState<RiskTolerance | null>(null);
  const [earnAmount, setEarnAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("Working on it");
  const [result, setResult] = useState<{ title: string; sub?: string } | null>(null);
  const [strategies, setStrategies] = useState<Record<string, Strategy>>({});
  const [planDetail, setPlanDetail] = useState<PlanDetail | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // In API mode, pull the engine's live suggestions (v2: crypto-inclusive) when the sheet opens.
  useEffect(() => {
    if (!open || !API_MODE) return;
    let alive = true;
    api
      .strategies("1y")
      .then((r) => {
        if (alive) setStrategies(Object.fromEntries(r.strategies.map((s) => [s.id, s])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  const toWei = (s: string) => {
    try {
      const [w, f = ""] = (s || "0").split(".");
      return BigInt(w || "0") * 1_000_000n + BigInt((f + "000000").slice(0, 6));
    } catch {
      return 0n;
    }
  };
  const earnWei = toWei(earnAmount);
  const earnValid = earnWei > 0n && earnWei <= restingWei;
  const closeWei = toWei(closeAmount);
  const closeValid = closeWei > 0n && closeWei <= deployed;

  const summary = picked ? optionSummary(picked) : null;
  const projectedYear = summary ? (Number(earnWei) / 1e6) * (summary.yieldApy / 100) : 0;
  // The engine's live v2 suggestion for the picked strategy (API mode). Carries the crypto exposure.
  const pickedStrategy = picked ? strategies[STRATEGY_ID[picked]] : undefined;

  // User pressing "cancel" in the wallet popup isn't an error — swallow it.
  const fail = (e: unknown) => {
    if (!/reject|denied|cancel/i.test(String(e))) {
      setResult({ title: "Couldn't complete", sub: "Please try again." });
    }
  };

  // Fetch the detailed plan (allocation + on-chain actions) for the picked strategy + amount.
  const viewPlan = async () => {
    if (!picked || !earnValid || loadingPlan) return;
    setLoadingPlan(true);
    try {
      const p = await api.plan({ strategy: STRATEGY_ID[picked], amount: earnWei.toString(), term: "1y" });
      setPlanDetail(p);
    } catch (e) {
      fail(e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const startEarning = async () => {
    if (!picked || !earnValid || busy) return;
    setPlanDetail(null); // leave the detail view so the busy spinner + result show
    setBusyMsg("Putting your money to work");
    setBusy(true);
    try {
      await view.earn(earnWei, picked);
      setResult({ title: "Now earning", sub: "Your money is working." });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const doHarvest = async () => {
    if (busy) return;
    setBusyMsg("Collecting your interest");
    setBusy(true);
    try {
      const r = await view.harvest();
      setResult(
        r.netBase > 0n
          ? { title: `Harvested ${fmtUsd(r.netBase)}`, sub: "To your wallet" }
          : { title: "Nothing to collect yet", sub: "Check back as it grows." },
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const doClose = async () => {
    if (!closeValid || busy) return;
    setBusyMsg("Moving your money back");
    setBusy(true);
    try {
      await view.closePosition(closeWei);
      setResult({ title: `Closing ${fmtUsd(closeWei)}`, sub: "Arrives in your wallet shortly." });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setResult(null);
    setPlanDetail(null);
    setEarnAmount("");
    setCloseAmount("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Earn">
      {planDetail ? (
        <div className="flex flex-col gap-4">
          {/* the mix: savings vs crypto */}
          <div>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {planDetail.summary.savingsPct > 0 && (
                <div style={{ width: `${planDetail.summary.savingsPct}%` }} className="bg-accent" />
              )}
              {planDetail.summary.cryptoPct > 0 && (
                <div style={{ width: `${planDetail.summary.cryptoPct}%` }} className="bg-[#c8a08f]" />
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted">
              <span>{planDetail.summary.savingsPct}% savings</span>
              <span>{planDetail.summary.cryptoPct}% crypto</span>
            </div>
          </div>

          {/* steady + growth */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-xs text-muted">Steady · savings</p>
              <p className="mt-0.5 font-semibold text-good">
                ≈{(planDetail.summary.blendedYieldBps / 100).toFixed(1)}%/yr
              </p>
            </div>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-xs text-muted">Growth · crypto</p>
              <p className="mt-0.5 font-semibold text-[#c8a08f]">
                {pctBps(planDetail.summary.cryptoExpectedBps)} typical
              </p>
              <p className="text-xs text-muted">
                {pctBps(planDetail.summary.cryptoDownsideBps)} … {pctBps(planDetail.summary.cryptoUpsideBps)}
              </p>
            </div>
          </div>

          {/* per-venue allocation */}
          <ul className="space-y-2 text-sm">
            {planDetail.allocation.map((a) => (
              <li key={a.position_id} className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.class === "crypto" ? "bg-[#c8a08f]" : "bg-accent"}`}
                />
                <span className="flex-1">{a.symbol}</span>
                <span className="text-muted">{a.pct}%</span>
                <span className="w-28 text-right text-muted">
                  {a.class === "crypto"
                    ? `${pctBps(a.expected_return_bps)} typ.`
                    : `≈${(a.apy_bps / 100).toFixed(1)}%/yr`}
                </span>
              </li>
            ))}
          </ul>

          {/* on-chain steps */}
          <div className="rounded-xl border border-line bg-paper p-3">
            <p className="mb-2 text-xs font-medium text-muted">
              On-chain steps you sign ({planDetail.actions.length})
            </p>
            <ul className="space-y-1 font-mono text-xs">
              {planDetail.actions.map((act, i) => (
                <li key={i} className="flex justify-between">
                  <span>{act.kind === 0 ? "Deposit" : act.kind === 1 ? "Withdraw" : "Buy crypto"}</span>
                  <span className="text-muted">{fmtUsd(BigInt(act.amount || "0"))}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted">{planDetail.reasoning}</p>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPlanDetail(null)}>
              Back
            </Button>
            <Button full icon={<IconTrendUp />} disabled={busy} onClick={startEarning}>
              {busy ? "Working…" : "Start earning"}
            </Button>
          </div>
        </div>
      ) : result ? (
        <SheetSuccess title={result.title} onDone={close}>
          {result.sub}
        </SheetSuccess>
      ) : busy ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="font-medium">{busyMsg}…</p>
          <p className="text-sm text-muted">This only takes a moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex gap-1 rounded-lg bg-paper p-1 text-sm">
            <button
              onClick={() => setTab("earn")}
              className={`flex-1 rounded-md py-1.5 transition-colors ${
                tab === "earn" ? "bg-card font-medium shadow-sm" : "text-muted"
              }`}
            >
              Earn money
            </button>
            <button
              onClick={() => setTab("positions")}
              className={`flex-1 rounded-md py-1.5 transition-colors ${
                tab === "positions" ? "bg-card font-medium shadow-sm" : "text-muted"
              }`}
            >
              Your positions
            </button>
          </div>

          {tab === "earn" ? (
            canEarn ? (
              <div className="flex flex-col gap-4">
                {/* 1 — pick a strategy */}
                <div className="flex flex-col gap-2">
                  {CHOICES.map((c) => {
                    const s = optionSummary(c.value);
                    const bs = strategies[STRATEGY_ID[c.value]]; // engine's live v2 suggestion (API mode)
                    return (
                      <button
                        key={c.value}
                        onClick={() => setPicked(c.value)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                          picked === c.value ? "border-accent bg-accent/5" : "border-line hover:border-muted"
                        }`}
                      >
                        <span className="font-medium">{c.label}</span>
                        {bs ? (
                          <span className="flex items-center gap-2 text-sm">
                            {bs.cryptoPct > 0 && (
                              <span className="rounded-full bg-[#c8a08f]/15 px-2 py-0.5 text-xs text-[#c8a08f]">
                                {bs.cryptoPct}% crypto
                              </span>
                            )}
                            <span className="text-good">~{(bs.expectedReturnBps / 100).toFixed(0)}%/yr</span>
                          </span>
                        ) : (
                          <span className="text-sm text-good">≈{s.yieldApy.toFixed(1)}%/yr</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 2 — after picking: allocation preview, then how much (near the button) */}
                {picked && (
                  <>
                    {pickedStrategy ? (
                      // engine v2 (API mode): the savings/crypto mix + expected range over a year
                      <div className="rounded-xl border border-line bg-card p-4">
                        <div className="mb-3 flex h-2.5 overflow-hidden rounded-full">
                          {pickedStrategy.savingsPct > 0 && (
                            <div style={{ width: `${pickedStrategy.savingsPct}%` }} className="bg-accent" />
                          )}
                          {pickedStrategy.cryptoPct > 0 && (
                            <div style={{ width: `${pickedStrategy.cryptoPct}%` }} className="bg-[#c8a08f]" />
                          )}
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                            <span className="flex-1">Savings (USDC)</span>
                            <span className="text-muted">{pickedStrategy.savingsPct}%</span>
                            <span className="w-20 text-right text-good">
                              ≈{(pickedStrategy.apyBps / 100).toFixed(1)}%/yr
                            </span>
                          </li>
                          {pickedStrategy.cryptoPct > 0 && (
                            <li className="flex items-center gap-2.5">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#c8a08f]" />
                              <span className="flex-1">Crypto (BTC/ETH)</span>
                              <span className="text-muted">{pickedStrategy.cryptoPct}%</span>
                              <span className="w-20 text-right text-[#c8a08f]">
                                {pctBps(pickedStrategy.upsideBps)} up
                              </span>
                            </li>
                          )}
                        </ul>
                        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
                          <span className="text-muted">Expected in a year</span>
                          <span className="font-medium">
                            {pctBps(pickedStrategy.expectedReturnBps)}{" "}
                            <span className="text-muted">
                              ({pctBps(pickedStrategy.downsideBps)}…{pctBps(pickedStrategy.upsideBps)})
                            </span>
                          </span>
                        </div>
                        {pickedStrategy.cryptoPct > 0 && (
                          <p className="mt-2 text-xs text-muted">
                            Includes crypto — the price can swing. “View plan” shows the full breakdown.
                          </p>
                        )}
                      </div>
                    ) : summary ? (
                      <div className="rounded-xl border border-line bg-card p-4">
                        {summary.slices.length > 1 && (
                          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
                            {summary.slices.map((s, i) => (
                              <div
                                key={s.key}
                                style={{ width: `${s.percent}%` }}
                                className={BAR_TONE[i % BAR_TONE.length]}
                              />
                            ))}
                          </div>
                        )}
                        <ul className="space-y-2.5 text-sm">
                          {summary.slices.map((s, i) => (
                            <li key={s.key} className="flex items-center gap-2.5">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAR_TONE[i % BAR_TONE.length]}`} />
                              <span className="flex-1">{s.name}</span>
                              <span className="text-muted">{s.percent}%</span>
                              <span className="w-20 text-right text-good">≈{s.apy}%/yr</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
                          <span className="text-muted">Est. earnings in a year</span>
                          <span className="font-medium text-good">
                            ≈{fmtUsd(BigInt(Math.round(projectedYear * 1e6)))}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">How much to earn</span>
                      <div className="flex gap-2">
                        <input
                          value={earnAmount}
                          onChange={(e) => setEarnAmount(e.target.value.trim())}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEarnAmount((Number(restingWei) / 1e6).toString())}
                        >
                          All
                        </Button>
                      </div>
                      <span className="text-xs text-muted">{fmtUsd(restingWei)} in your wallet</span>
                    </label>

                    {DEPOSIT_FEE_BPS > 0 && earnValid && (
                      <p className="text-xs text-muted">
                        Platform fee {(DEPOSIT_FEE_BPS / 100).toFixed(2)}% ·{" "}
                        ≈{fmtUsd(BigInt(Math.round((Number(earnAmount) * DEPOSIT_FEE_BPS) / 10000 * 1e6)))} on this
                        deposit · withdrawals are always free
                      </p>
                    )}
                  </>
                )}

                {/* 3 — view the detailed plan (engine, API mode), then go */}
                {pickedStrategy && (
                  <Button
                    variant="secondary"
                    full
                    disabled={!earnValid || loadingPlan}
                    onClick={viewPlan}
                  >
                    {loadingPlan ? "Loading plan…" : "View plan"}
                  </Button>
                )}
                <Button full icon={<IconTrendUp />} disabled={!picked || !earnValid || busy} onClick={startEarning}>
                  {busy ? "Working…" : "Start earning"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="font-medium">Nothing to earn yet</p>
                <Button full className="mt-1" icon={<IconPlus />} onClick={onAddMoney}>
                  Add money
                </Button>
              </div>
            )
          ) : canExit ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-line bg-card p-4 text-center">
                <p className="text-sm text-muted">Interest earned</p>
                <HeroBalance
                  compute={view.liveAccruedUsd}
                  precision={4}
                  className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums text-good"
                />
                <p className="mt-1 text-xs text-muted">
                  on {fmtUsd(deployed)} · ≈{(view.apyBps / 100).toFixed(1)}%/yr
                </p>
              </div>

              <div>
                <Button variant="secondary" full disabled={busy} onClick={doHarvest}>
                  Harvest interest
                </Button>
                <p className="mt-1.5 text-xs text-muted">Interest to your wallet — no fee.</p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-sm font-medium">Close position</p>
                <p className="mt-0.5 text-xs text-muted">Move your money back to your wallet.</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={closeAmount}
                    onChange={(e) => setCloseAmount(e.target.value.trim())}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCloseAmount((Number(deployed) / 1e6).toString())}
                  >
                    All
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  full
                  className="mt-2"
                  disabled={!closeValid || busy}
                  onClick={doClose}
                >
                  Close position
                </Button>
                <p className="mt-1.5 text-xs text-muted">May take a moment to arrive.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="font-medium">Not earning yet</p>
              <Button className="mt-1" onClick={() => setTab("earn")}>
                Earn money
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
