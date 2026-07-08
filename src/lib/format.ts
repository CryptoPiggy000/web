import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./chain";

/** Số dư heo đất luôn quy về đô-la. */
export function fmtUsd(base: bigint, opts?: { cents?: boolean }): string {
  const n = Number(formatUnits(base, USDC_DECIMALS));
  const digits = opts?.cents === false ? 0 : 2;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function usdToNumber(base: bigint): number {
  return Number(formatUnits(base, USDC_DECIMALS));
}

export function shortAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
