"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { usePiggyView } from "@/lib/piggy";
import { activeChain, explorerAddressUrl } from "@/lib/chain";
import { fmtTime, shortAddress } from "@/lib/format";

export function SettingsSheet({
  open,
  onClose,
  piggyAddress,
}: {
  open: boolean;
  onClose: () => void;
  piggyAddress?: `0x${string}`;
}) {
  const { user, logout, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const owner = wallets.find((w) => w.walletClientType === "privy")?.address;
  const { activity, reset } = usePiggyView();
  const router = useRouter();

  const email = user?.email?.address ?? user?.google?.email ?? "—";

  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <div className="flex flex-col gap-6">
        <section>
          <p className="font-medium">{email}</p>
          {piggyAddress && (
            <a
              href={explorerAddressUrl(piggyAddress)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-xs text-muted underline decoration-line underline-offset-4"
            >
              piggy {shortAddress(piggyAddress)} · {activeChain.name}
            </a>
          )}
          {owner && (
            <p className="mt-1 font-mono text-xs text-muted">
              wallet (pays gas) <span className="select-all">{owner}</span>
            </p>
          )}
        </section>

        {activity.length > 0 && (
          <section>
            <p className="mb-2 text-sm font-medium">Recent</p>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {activity.slice(0, 20).map((a, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 flex-1">{a.summary}</span>
                  <span className="whitespace-nowrap text-xs text-muted">{fmtTime(a.ts)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex items-center justify-between border-t border-line pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
          >
            Sign out
          </Button>
          <Button variant="ghost" size="sm" onClick={exportWallet}>
            Export key
          </Button>
        </section>

        <Button variant="ghost" size="sm" className="self-start" onClick={reset}>
          Reset demo data
        </Button>
      </div>
    </Sheet>
  );
}
