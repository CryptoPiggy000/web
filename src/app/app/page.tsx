"use client";

import { useState } from "react";
import { usePiggyView } from "@/lib/piggy";
import { fmtUsd } from "@/lib/format";
import { BalanceCard } from "@/components/balance-card";
import { Button } from "@/components/button";
import { IconTrendUp, IconArrowDown, IconPlus } from "@/components/icons";
import { DepositSheet } from "@/components/deposit-sheet";
import { WithdrawSheet } from "@/components/withdraw-sheet";
import { GrowSheet } from "@/components/grow-sheet";
import { SettingsSheet } from "@/components/settings-sheet";

type SheetName = "deposit" | "withdraw" | "grow" | "settings" | null;

export default function Home() {
  const view = usePiggyView();
  const [sheet, setSheet] = useState<SheetName>(null);

  const { piggyAddress, restingBase, deployedBase, earning, empty, apyBps } = view;
  const close = () => setSheet(null);
  const earnLabel = earning ? "Earn more" : "Start earning";

  const status = empty ? (
    <span className="text-muted">Feed your piggy to start.</span>
  ) : earning ? (
    <span className="text-good">Growing at ≈{(apyBps / 100).toFixed(1)}%/yr</span>
  ) : (
    <span className="text-muted">Resting. Put it to work.</span>
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-mono text-lg font-semibold tracking-tight text-accent">CryptoPiggy</span>
        <button
          onClick={() => setSheet("settings")}
          aria-label="Settings"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-card hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="flex flex-1 flex-col items-center justify-center">
          <BalanceCard
            compute={view.liveTotalUsd}
            precision={earning ? 4 : 2}
            status={status}
            bumpValue={view.bumpValueUsd}
          />

          {earning && (
            <div className="mt-2 flex items-center gap-4 px-6 text-sm">
              <span className="text-muted">
                In wallet <span className="font-medium text-ink">{fmtUsd(restingBase)}</span>
              </span>
              <span className="text-line">·</span>
              <span className="text-muted">
                Earning <span className="font-medium text-ink">{fmtUsd(deployedBase)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 px-6">
          {empty ? (
            <Button full size="lg" icon={<IconPlus />} onClick={() => setSheet("deposit")}>
              Add money
            </Button>
          ) : (
            <>
              <Button full size="lg" icon={<IconTrendUp />} onClick={() => setSheet("grow")}>
                {earnLabel}
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" full icon={<IconPlus />} onClick={() => setSheet("deposit")}>
                  Add money
                </Button>
                <Button variant="secondary" full icon={<IconArrowDown />} onClick={() => setSheet("withdraw")}>
                  Withdraw
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <DepositSheet open={sheet === "deposit"} onClose={close} address={piggyAddress} />
      <WithdrawSheet
        open={sheet === "withdraw"}
        onClose={close}
        onManageEarning={() => setSheet("grow")}
      />
      <GrowSheet open={sheet === "grow"} onClose={close} onAddMoney={() => setSheet("deposit")} />
      <SettingsSheet open={sheet === "settings"} onClose={close} piggyAddress={piggyAddress} />
    </div>
  );
}
