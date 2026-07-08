"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet } from "./sheet";
import { HeroBalance } from "./hero-balance";
import { Button } from "./button";
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
  idleWei,
  positions,
  onAddMoney,
}: {
  open: boolean;
  onClose: () => void;
  idleWei: bigint;
  positions: SimPosition[];
  onAddMoney: () => void;
}) {
  const { preference, earnSince, setPreference, applyPlanSimulation, harvest } = useSim();
  const [picked, setPicked] = useState<RiskTolerance | null>(
    preference?.riskTolerance ?? null,
  );
  const [result, setResult] = useState<string | null>(null);

  const planQuery = useQuery({
    queryKey: ["grow-plan", picked, idleWei.toString()],
    queryFn: () => previewPlan(idleWei, toPreference(picked as RiskTolerance)),
    enabled: open && Boolean(picked) && idleWei > 0n,
  });
  const plan = planQuery.data;

  const deployed = positions.reduce((a, p) => a + BigInt(p.amountWei), 0n);
  const blendedApy =
    deployed > 0n
      ? positions.reduce((a, p) => a + (p.apy ?? 0) * Number(BigInt(p.amountWei)), 0) /
        Number(deployed)
      : 0;
  const accruedCompute = (now: number) =>
    Number(accruedWei(positions, earnSince, now)) / 1e6;

  const startEarning = () => {
    if (!plan || !picked) return;
    setPreference(toPreference(picked));
    applyPlanSimulation(
      plan.targetMix.map((s) => ({
        key: s.key,
        name: s.name,
        amountWei: ((idleWei * BigInt(s.percent)) / 100n).toString(),
        apy: s.apy,
      })),
      "Started earning",
    );
    setResult("Now earning. Your money is working.");
  };

  const doHarvest = () => {
    const gained = accruedWei(positions, earnSince, Date.now());
    harvest();
    setResult(`Harvested ${fmtUsd(gained)}. Added to your balance.`);
  };

  const close = () => {
    setResult(null);
    onClose();
  };

  const summary = picked ? optionSummary(picked) : null;
  const idleUsd = Number(idleWei) / 1e6;
  const projectedYear = summary ? (idleUsd * summary.yieldApy) / 100 : 0;

  const noMoney = idleWei === 0n && positions.length === 0;
  const allDeployed = idleWei === 0n && positions.length > 0;

  return (
    <Sheet open={open} onClose={close} title="Earn">
      {result ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="font-medium text-good">{result}</p>
          <p className="text-sm text-muted">Withdraw anytime, no lock-up.</p>
          <Button className="mt-2" onClick={close}>
            Nice
          </Button>
        </div>
      ) : noMoney ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-medium">Add money to start earning</p>
          <p className="text-sm text-muted">
            Your piggy needs some dollars first. Then it goes to work for you.
          </p>
          <Button full className="mt-2" icon={<IconPlus />} onClick={onAddMoney}>
            Add money
          </Button>
        </div>
      ) : allDeployed ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-line bg-card p-5 text-center">
            <p className="text-sm text-muted">Interest earned so far</p>
            <HeroBalance
              compute={accruedCompute}
              precision={4}
              className="mt-1 block text-3xl font-semibold tracking-tight tabular-nums text-good"
            />
            <p className="mt-1 text-xs text-muted">
              ≈{blendedApy.toFixed(1)}%/yr on {fmtUsd(deployed)}
            </p>
          </div>
          <Button full onClick={doHarvest}>
            Harvest interest
          </Button>
          <Button variant="ghost" size="sm" icon={<IconPlus />} onClick={onAddMoney}>
            Add money to earn more
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {positions.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm">
              <span className="text-muted">Already earning ≈{blendedApy.toFixed(1)}%/yr</span>
              <button
                onClick={doHarvest}
                className="font-medium text-accent transition-colors hover:text-accent-deep"
              >
                Harvest
              </button>
            </div>
          )}

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
              <p className="text-sm text-muted">Put {fmtUsd(idleWei)} to work as</p>

              {summary.slices.length > 1 && (
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
                  {summary.slices.map((s, i) => (
                    <div
                      key={s.key}
                      style={{ width: `${s.percent}%` }}
                      className={BAR_TONE[i % BAR_TONE.length]}
                    />
                  ))}
                </div>
              )}

              <ul className="mt-4 space-y-2.5 text-sm">
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
      )}
    </Sheet>
  );
}
