"use client";

import { Sheet } from "./sheet";
import { Button } from "./button";
import { HeroBalance } from "./hero-balance";
import { usePiggyView } from "@/lib/piggy";
import { fmtUsd, fmtTime } from "@/lib/format";

// crypto (held-asset) positions vs savings — colors the dots/bars accordingly
const CRYPTO_KEY = /wsteth|weth|wbtc|cbbtc|btc|eth|sol|crypto/i;

export function PortfolioSheet({
  open,
  onClose,
  onManage,
}: {
  open: boolean;
  onClose: () => void;
  onManage: () => void;
}) {
  const view = usePiggyView();
  const { restingBase, deployedBase, positions, apyBps, activity, earning } = view;
  const total = restingBase + deployedBase;
  const restPct = total > 0n ? Number((restingBase * 1000n) / total) / 10 : 0;
  const earnPct = 100 - restPct;

  return (
    <Sheet open={open} onClose={onClose} title="Portfolio">
      <div className="flex flex-col gap-5">
        {/* total */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Total value
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{fmtUsd(total)}</p>
        </div>

        {/* wallet vs earning split */}
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
            <div className="bg-accent/55" style={{ width: `${restPct}%` }} />
            <div className="bg-good" style={{ width: `${earnPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full bg-accent/55" />
              In wallet <span className="font-medium text-ink">{fmtUsd(restingBase)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full bg-good" />
              Earning <span className="font-medium text-ink">{fmtUsd(deployedBase)}</span>
            </span>
          </div>
        </div>

        {/* live interest (mocks read flat; real on Base) */}
        {earning && (
          <div className="rounded-xl border border-line bg-card p-4 text-center">
            <p className="text-xs text-muted">Interest earned</p>
            <HeroBalance
              compute={view.liveAccruedUsd}
              precision={4}
              className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums text-good"
            />
          </div>
        )}

        {/* per-venue allocation */}
        <div>
          <p className="mb-2 text-sm font-medium">Where it&apos;s invested</p>
          {positions.length > 0 ? (
            <>
              <ul className="space-y-2.5 text-sm">
                {positions.map((p) => {
                  const isCrypto = p.cls ? p.cls === "crypto" : CRYPTO_KEY.test(p.key);
                  return (
                    <li key={p.key} className="flex items-center gap-2.5">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${isCrypto ? "bg-crypto" : "bg-good"}`}
                      />
                      <span className="flex-1">{p.name}</span>
                      <span className="tabular-nums text-muted">{fmtUsd(p.base)}</span>
                      {p.apyBps > 0 && (
                        <span className="w-16 text-right tabular-nums text-good">
                          ≈{(p.apyBps / 100).toFixed(1)}%
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {apyBps > 0 && (
                <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
                  <span className="text-muted">Blended yield</span>
                  <span className="font-medium text-good">≈{(apyBps / 100).toFixed(1)}%/yr</span>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-line bg-card p-4 text-center text-sm text-muted">
              Nothing invested yet. Put money to work to see it here.
            </p>
          )}
        </div>

        {/* recent activity */}
        <div>
          <p className="mb-2 text-sm font-medium">Recent activity</p>
          {activity.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {activity.slice(0, 8).map((a, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate">{a.summary}</span>
                  <span className="whitespace-nowrap text-xs text-muted">{fmtTime(a.ts)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No activity yet — your moves will show up here.</p>
          )}
        </div>

        {earning && (
          <Button full variant="secondary" onClick={onManage}>
            Manage positions
          </Button>
        )}
      </div>
    </Sheet>
  );
}
