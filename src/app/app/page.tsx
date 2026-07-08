"use client";

import { useCallback, useState } from "react";
import { usePiggy } from "@/lib/usePiggy";
import { useSim, deployedTotalWei, accruedWei } from "@/lib/sim";
import { fmtUsd, usdToNumber } from "@/lib/format";
import { BalanceCard } from "@/components/balance-card";
import { Button } from "@/components/button";
import { IconTrendUp, IconArrowDown } from "@/components/icons";
import { DepositSheet } from "@/components/deposit-sheet";
import { WithdrawSheet } from "@/components/withdraw-sheet";
import { GrowSheet } from "@/components/grow-sheet";
import { SettingsSheet } from "@/components/settings-sheet";

type SheetName = "deposit" | "withdraw" | "grow" | "settings" | null;

export default function Home() {
  const { piggyAddress, balance } = usePiggy();
  const { positions, earnSince, harvestedWei } = useSim();
  const [sheet, setSheet] = useState<SheetName>(null);

  const deployed = deployedTotalWei(positions);
  const idle = balance > deployed ? balance - deployed : 0n;
  const empty = balance === 0n && positions.length === 0;
  const earning = deployed > 0n;

  const blendedApy = earning
    ? positions.reduce((a, p) => a + (p.apy ?? 0) * Number(BigInt(p.amountWei)), 0) /
      Number(deployed)
    : 0;

  // Số dư sống = USDC thật + lãi đã harvest + lãi đang cộng dồn (Phase 0 sim).
  const realUsd = usdToNumber(balance);
  const harvestedUsd = Number(BigInt(harvestedWei)) / 1e6;
  const compute = useCallback(
    (now: number) => realUsd + harvestedUsd + Number(accruedWei(positions, earnSince, now)) / 1e6,
    [realUsd, harvestedUsd, positions, earnSince],
  );

  const close = () => setSheet(null);
  const primaryLabel = earning ? "Earn more" : "Start earning";

  const status = empty ? (
    <span className="text-muted">Feed your piggy to start.</span>
  ) : earning ? (
    <span className="text-good">
      Growing at ≈{blendedApy.toFixed(1)}%/yr
      {idle > 0n && <span className="text-muted"> · {fmtUsd(idle)} resting</span>}
    </span>
  ) : (
    <span className="text-muted">Resting. Put it to work.</span>
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-mono text-sm font-semibold text-accent">CryptoPiggy</span>
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
            compute={compute}
            precision={earning ? 4 : 2}
            status={status}
            bumpValue={realUsd}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-3 px-6">
          <Button full size="lg" icon={<IconTrendUp />} onClick={() => setSheet("grow")}>
            {primaryLabel}
          </Button>
          {!empty && (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconArrowDown />}
              onClick={() => setSheet("withdraw")}
            >
              Withdraw
            </Button>
          )}
        </div>
      </main>

      <DepositSheet open={sheet === "deposit"} onClose={close} address={piggyAddress} />
      <WithdrawSheet open={sheet === "withdraw"} onClose={close} idleBase={balance} owner={piggyAddress} />
      <GrowSheet
        open={sheet === "grow"}
        onClose={close}
        idleWei={idle}
        positions={positions}
        onAddMoney={() => setSheet("deposit")}
      />
      <SettingsSheet open={sheet === "settings"} onClose={close} piggyAddress={piggyAddress} />
    </div>
  );
}
