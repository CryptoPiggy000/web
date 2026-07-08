"use client";

import { useState } from "react";
import { erc20Abi, isAddress, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { useSim } from "@/lib/sim";
import { fmtUsd } from "@/lib/format";
import { explorerTxUrl, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chain";

export function WithdrawSheet({
  open,
  onClose,
  idleBase,
}: {
  open: boolean;
  onClose: () => void;
  idleBase: bigint;
  owner?: `0x${string}`;
}) {
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
    amountValid = amountBase > 0n && amountBase <= idleBase;
  } catch {
    amountValid = false;
  }
  const toValid = isAddress(to);

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
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="font-medium text-good">Sent.</p>
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted underline underline-offset-4"
          >
            View transaction
          </a>
          <Button
            className="mt-2"
            onClick={() => {
              setTxHash(null);
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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
                onClick={() => setAmount((Number(idleBase) / 1e6).toString())}
              >
                Max
              </Button>
            </div>
            <span className="text-xs text-muted">{fmtUsd(idleBase)} available</span>
          </label>

          <Button full disabled={!toValid || !amountValid || isPending} onClick={submit}>
            {isPending ? "Sending…" : "Withdraw"}
          </Button>
          {error && <p className="text-sm text-accent-deep">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
