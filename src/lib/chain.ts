import { base, foundry, sepolia } from "viem/chains";

/** Chain đang chạy — ẩn hoàn toàn khỏi user. Đổi qua env; "anvil" = local demo (foundry 31337). */
export const activeChain =
  process.env.NEXT_PUBLIC_CHAIN === "base"
    ? base
    : process.env.NEXT_PUBLIC_CHAIN === "anvil"
      ? foundry
      : sepolia;

/**
 * Địa chỉ AccountFactory trên Base (repo contracts, Vũ deploy).
 * Chưa có → Phase 0: địa chỉ heo đất = chính ví embedded của user.
 * Có → chuyển sang địa chỉ counterfactual qua predict(owner, salt).
 */
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as
  | `0x${string}`
  | undefined;

/** USDC — đồng tiền của heo đất. Dollar-denominated, không biến động giá. */
const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia (Circle)
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // anvil DeployLocal mock (18-dec)
};

export const USDC_ADDRESS = USDC_BY_CHAIN[activeChain.id];
export const USDC_DECIMALS = 6;

/**
 * Cổng nạp fiat (thẻ/PayPal). On-ramp thật đi qua backend engine (POST /onramp/session).
 * Chưa cấu hình backend (NEXT_PUBLIC_API_URL trống) → DEV: mô phỏng checkout + cộng sandbox.
 */
export const ONRAMP_DEV = !process.env.NEXT_PUBLIC_API_URL;

export const explorerUrl =
  activeChain.blockExplorers?.default.url ?? "https://etherscan.io";

export function explorerAddressUrl(address: string) {
  return `${explorerUrl}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${explorerUrl}/tx/${hash}`;
}
