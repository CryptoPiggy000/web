"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { SheetSuccess } from "./sheet-success";
import { IconCard, IconQr, IconCheck } from "./icons";
import { usePiggyView } from "@/lib/piggy";
import { activeChain, ONRAMP_DEV } from "@/lib/chain";
import { CHAIN_MODE } from "@/lib/contracts";

type Mode = "choose" | "fiat" | "crypto";
type FiatStep = "form" | "processing" | "done";

export function DepositSheet({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: `0x${string}`;
}) {
  const view = usePiggyView();
  // On-chain (testnet): fund via the crypto address (real USDC). Fiat on-ramp is prod-only.
  const [mode, setMode] = useState<Mode>(CHAIN_MODE ? "crypto" : "choose");
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [fiatStep, setFiatStep] = useState<FiatStep>("form");

  if (!address) return null;

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payWithCard = async () => {
    if (!amountValid) return;
    setFiatStep("processing");
    // Dev/mock: credits the wallet. Prod: backend returns a hosted checkout URL (API.md).
    await new Promise((r) => setTimeout(r, 1000));
    await view.addFiat(amountNum);
    setFiatStep("done");
  };

  const close = () => {
    setMode("choose");
    setAmount("");
    setFiatStep("form");
    onClose();
  };

  const title =
    mode === "fiat" ? "Buy with card" : mode === "crypto" ? "Receive crypto" : "Add money";

  return (
    <Sheet open={open} onClose={close} title={title}>
      {mode === "choose" ? (
        <div className="flex flex-col gap-3">
          {!CHAIN_MODE && (
            <button
              onClick={() => setMode("fiat")}
              className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 text-left transition-colors hover:border-muted"
            >
              <IconCard className="h-6 w-6 text-accent" />
              <span>
                <span className="block font-medium">Card or PayPal</span>
                <span className="block text-sm text-muted">Pay in dollars. No crypto needed.</span>
              </span>
            </button>
          )}
          <button
            onClick={() => setMode("crypto")}
            className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 text-left transition-colors hover:border-muted"
          >
            <IconQr className="h-6 w-6 text-accent" />
            <span>
              <span className="block font-medium">I already have crypto</span>
              <span className="block text-sm text-muted">Send USDC to your address.</span>
            </span>
          </button>
        </div>
      ) : mode === "fiat" ? (
        fiatStep === "done" ? (
          <SheetSuccess title={`Added $${amountNum.toFixed(2)}`} onDone={close}>
            {ONRAMP_DEV ? "Sandbox top-up · ready to earn" : "Ready to earn"}
          </SheetSuccess>
        ) : fiatStep === "processing" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="text-sm text-muted">Processing…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Amount (USD)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.trim())}
                placeholder="50.00"
                inputMode="decimal"
                className="rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
              />
            </label>
            <Button full disabled={!amountValid} icon={<IconCard />} onClick={payWithCard}>
              {ONRAMP_DEV ? "Pay (sandbox)" : "Continue to checkout"}
            </Button>
            {ONRAMP_DEV && <p className="text-xs text-muted">Dev sandbox — simulates checkout.</p>}
            <button
              onClick={() => setMode("choose")}
              className="text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              Back
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="rounded-xl border border-line bg-white p-3">
            <QRCode value={address} size={168} />
          </div>
          <p className="w-full break-all rounded-lg bg-paper px-3 py-2 font-mono text-xs">
            {address}
          </p>
          <Button full onClick={copy} icon={copied ? <IconCheck /> : undefined}>
            {copied ? "Copied" : "Copy address"}
          </Button>
          <p className="text-sm text-muted">Send USDC on {activeChain.name}. Nothing else.</p>
          {CHAIN_MODE ? (
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent underline underline-offset-4"
            >
              Need test USDC? Circle Sepolia faucet
            </a>
          ) : (
            <button
              onClick={() => setMode("choose")}
              className="text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              Back
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
