"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { SheetSuccess } from "./sheet-success";
import { HeroBalance } from "./hero-balance";
import { IconPlus, IconTrendUp } from "./icons";
import { useSim, accruedWei } from "@/lib/sim";
import { previewPlan, optionSummary } from "@/lib/planner";
import { fmtUsd } from "@/lib/format";
import type { Preference, RiskTolerance, SimPosition } from "@/lib/types";

const CHOICES: { value: RiskTolerance; label: string }[] = [
  { value: "khong", label: "Safe" },
  { value: "mot-chut", label: "Balanced" },
  { value: "thoai-mai", label: "Higher yield" },
];

const BAR_TONE = ["bg-accent", "bg-accent/55", "bg-[#c8a08f]"];

function toPreference(risk: RiskTolerance): Preference {
  return { goal: "tich-luy", riskTolerance: risk, horizon: "6-24-thang" };
}

export function GrowSheet({
  open,
  onClose,
  restingWei,
  positions,
  onAddMoney,
}: {
  open: boolean;
  onClose: () => void;
  restingWei: bigint;
  positions: SimPosition[];
  onAddMoney: () => void;
}) {
  const { preference, earnSince, setPreference, earnMore, harvest, exitToWallet } = useSim();

  const deployed = positions.reduce((a, p) => a + BigInt(p.amountWei), 0n);
  const canEarn = restingWei > 0n;
  const canExit = deployed > 0n;

  const [tab, setTab] = useState<"earn" | "positions">(
    canExit && !canEarn ? "positions" : "earn",
  );
  const [picked, setPicked] = useState<RiskTolerance | null>(
    preference?.riskTolerance ?? null,
  );
  const [closeAmount, setCloseAmount] = useState("");
  const [result, setResult] = useState<{ title: string; sub?: string } | null>(null);

  const planQuery = useQuery({
    queryKey: ["grow-plan", picked, restingWei.toString()],
    queryFn: () => previewPlan(restingWei, toPreference(picked as RiskTolerance)),
    enabled: open && tab === "earn" && Boolean(picked) && restingWei > 0n,
  });
  const plan = planQuery.data;

  const blendedApy =
    deployed > 0n
      ? positions.reduce((a, p) => a + (p.apy ?? 0) * Number(BigInt(p.amountWei)), 0) /
        Number(deployed)
      : 0;
  const accruedLive = (now: number) => Number(accruedWei(positions, earnSince, now)) / 1e6;

  let closeWei = 0n;
  try {
    const [w, f = ""] = (closeAmount || "0").split(".");
    closeWei = BigInt(w || "0") * 1_000_000n + BigInt((f + "000000").slice(0, 6));
  } catch {
    closeWei = 0n;
  }
  const closeValid = closeWei > 0n && closeWei <= deployed;

  const summary = picked ? optionSummary(picked) : null;
  const restingUsd = Number(restingWei) / 1e6;
  const projectedYear = summary ? (restingUsd * summary.yieldApy) / 100 : 0;

  const startEarning = () => {
    if (!plan || !picked) return;
    setPreference(toPreference(picked));
    earnMore(
      plan.targetMix.map((s) => ({
        key: s.key,
        name: s.name,
        amountWei: ((restingWei * BigInt(s.percent)) / 100n).toString(),
        apy: s.apy,
      })),
      "Put money to work",
    );
    setResult({ title: "Now earning", sub: "Your money is working." });
  };

  const doHarvest = () => {
    const r = harvest();
    setResult(
      r.net > 0n
        ? { title: `Harvested ${fmtUsd(r.net)}`, sub: `To your wallet · fee ${fmtUsd(r.fee)}` }
        : { title: "Nothing to collect yet", sub: "Check back as it grows." },
    );
  };

  const doClose = () => {
    if (!closeValid) return;
    exitToWallet(closeWei);
    setResult({ title: `Closing ${fmtUsd(closeWei)}`, sub: "Arrives in your wallet shortly." });
  };

  const close = () => {
    setResult(null);
    setCloseAmount("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Earn">
      {result ? (
        <SheetSuccess title={result.title} onDone={close}>
          {result.sub}
        </SheetSuccess>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Tab select */}
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
                <p className="text-sm text-muted">
                  <span className="font-medium text-ink">{fmtUsd(restingWei)}</span> ready to earn
                </p>
                <div className="flex flex-col gap-2">
                  {CHOICES.map((c) => {
                    const s = optionSummary(c.value);
                    return (
                      <button
                        key={c.value}
                        onClick={() => setPicked(c.value)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                          picked === c.value
                            ? "border-accent bg-accent/5"
                            : "border-line hover:border-muted"
                        }`}
                      >
                        <span className="font-medium">{c.label}</span>
                        <span className="text-sm text-good">≈{s.yieldApy.toFixed(1)}%/yr</span>
                      </button>
                    );
                  })}
                </div>

                {picked && summary && (
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
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAR_TONE[i % BAR_TONE.length]}`}
                          />
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
                )}

                <Button
                  full
                  icon={<IconTrendUp />}
                  disabled={!picked || !plan || planQuery.isFetching}
                  onClick={startEarning}
                >
                  Start earning
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
                  compute={accruedLive}
                  precision={4}
                  className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums text-good"
                />
                <p className="mt-1 text-xs text-muted">
                  on {fmtUsd(deployed)} · ≈{blendedApy.toFixed(1)}%/yr
                </p>
              </div>

              <div>
                <Button variant="secondary" full onClick={doHarvest}>
                  Harvest interest
                </Button>
                <p className="mt-1.5 text-xs text-muted">Interest to your wallet · small fee.</p>
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
                  disabled={!closeValid}
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
