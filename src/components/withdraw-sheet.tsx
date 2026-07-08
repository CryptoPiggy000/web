"use client";

import { useState } from "react";
import { erc20Abi, isAddress, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { SheetSuccess } from "./sheet-success";
import { useSim } from "@/lib/sim";
import { fmtUsd } from "@/lib/format";
import { explorerTxUrl, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chain";

export function WithdrawSheet({
  open,
  onClose,
  availableBase,
  restingBase,
  earningBase,
  onManageEarning,
}: {
  open: boolean;
  onClose: () => void;
  availableBase: bigint; // USDC thật rút được ngay (từ ví)
  restingBase: bigint; // tổng trong ví hiển thị (gồm cả sandbox/lãi sim)
  earningBase: bigint; // vốn đang earn (phải gỡ vị thế mới rút được)
  onManageEarning: () => void; // mở màn Earn → Positions để gỡ vị thế
}) {
  const hasEarning = earningBase > 0n;
  const { addActivity } = useSim();
  const { writeContractAsync, isPending } = useWriteContract();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
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
  const hasSandbox = restingBase > availableBase; // phần trong ví là tiền test, không rút thật được

  const submit = async () => {
    if (!USDC_ADDRESS) return;
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [to as `0x${string}`, amountBase],
      });
      setTxHash(hash);
      addActivity({
        ts: Date.now(),
        type: "withdraw",
        summary: `Withdrew ${fmtUsd(amountBase)} to ${to.slice(0, 6)}…${to.slice(-4)}`,
        txHash: hash,
      });
      setAmount("");
      setTo("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /insufficient funds|gas/i.test(msg)
          ? "The piggy needs a little ETH to cover the network fee. (Handled automatically once we're live.)"
          : "Couldn't send. Try again.",
      );
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Withdraw">
      {txHash ? (
        <SheetSuccess
          title="Sent"
          onDone={() => {
            setTxHash(null);
            onClose();
          }}
        >
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            View transaction
          </a>
        </SheetSuccess>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Breakdown: rút được bao nhiêu, đang earn bao nhiêu */}
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
                {hasEarning
                  ? "It's all earning. Close a position to free it up."
                  : "Add money first."}
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

              <Button full disabled={!toValid || !amountValid || isPending} onClick={submit}>
                {isPending ? "Sending…" : "Confirm withdrawal"}
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
