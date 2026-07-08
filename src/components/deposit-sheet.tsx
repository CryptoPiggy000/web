"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { IconCheck } from "./icons";
import { activeChain } from "@/lib/chain";

export function DepositSheet({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: `0x${string}`;
}) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add money">
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
        <p className="text-sm text-muted">
          Send USDC on {activeChain.name}. Nothing else.
        </p>
      </div>
    </Sheet>
  );
}
