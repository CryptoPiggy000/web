"use client";

import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { SheetSuccess } from "./sheet-success";
import { usePiggyView } from "@/lib/piggy";
import { fmtUsd } from "@/lib/format";
import { explorerTxUrl, USDC_DECIMALS } from "@/lib/chain";

export function WithdrawSheet({
  open,
  onClose,
  onManageEarning,
}: {
  open: boolean;
  onClose: () => void;
  onManageEarning: () => void;
}) {
  const view = usePiggyView();
  const availableBase = view.withdrawableBase;
  const earningBase = view.deployedBase;
  const hasEarning = earningBase > 0n;
  const hasSandbox = view.restingBase > availableBase;

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let amountBase = 0n;
  let amountValid = false;
  try {
    amountBase = parseUnits(amount || "0", USDC_DECIMALS);
    amountValid = amountBase > 0n && amountBase <= availableBase;
  } catch {
    amountValid = false;
  }
  const toValid = isAddress(to);

  const submit = async () => {
    if (!toValid || !amountValid || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await view.withdraw(to as `0x${string}`, amountBase);
      setTxHash(r.txHash ?? null);
      setSent(true);
      setAmount("");
      setTo("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /insufficient funds|gas/i.test(msg)
          ? "The piggy needs a little ETH to cover the network fee. (Handled automatically once we're live.)"
          : "Couldn't send. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const done = () => {
    setSent(false);
    setTxHash(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Withdraw">
      {sent ? (
        <SheetSuccess title="Sent" onDone={done}>
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-ink"
            >
              View transaction
            </a>
          )}
        </SheetSuccess>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5 rounded-xl bg-paper p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Available to withdraw</span>
              <span className="font-medium">{fmtUsd(availableBase)}</span>
            </div>
            {hasEarning && (
              <div className="flex justify-between">
                <span className="text-muted">Still earning</span>
                <span className="text-muted">{fmtUsd(earningBase)}</span>
              </div>
            )}
          </div>

          {availableBase === 0n ? (
            <div className="flex flex-col items-center gap-3 py-1 text-center">
              <p className="text-sm text-muted">
                {hasEarning ? "It's all earning. Close a position to free it up." : "Add money first."}
              </p>
              {hasEarning && (
                <Button full variant="secondary" onClick={onManageEarning}>
                  Go to positions
                </Button>
              )}
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">To address</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value.trim())}
                  placeholder="0x…"
                  className="rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Amount</span>
                <div className="flex gap-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.trim())}
                    placeholder="10.00"
                    inputMode="decimal"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAmount((Number(availableBase) / 1e6).toString())}
                  >
                    Max
                  </Button>
                </div>
              </label>

              <Button full disabled={!toValid || !amountValid || busy} onClick={submit}>
                {busy ? "Sending…" : "Confirm withdrawal"}
              </Button>
              {error && <p className="text-sm text-accent-deep">{error}</p>}

              {hasEarning && (
                <button
                  onClick={onManageEarning}
                  className="text-center text-xs text-muted underline underline-offset-4 hover:text-ink"
                >
                  Need more? Close an earning position
                </button>
              )}
              {hasSandbox && (
                <p className="text-center text-xs text-muted">
                  Test / earned funds aren&apos;t withdrawable on testnet.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
