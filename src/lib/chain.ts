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
 * Gasless (EIP-7702 + Pimlico paymaster). Có PIMLICO_API_KEY → user zero-gas:
 * ví embedded được 7702-delegate, userOp trả phí qua paymaster của Pimlico.
 * Địa chỉ EOA giữ nguyên → onlyOwner của SmartInvestmentAccount vẫn pass.
 * Bỏ trống → fallback: ví embedded tự trả gas bằng ETH (cần nạp tay).
 */
export const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
export const SPONSORSHIP_POLICY_ID = process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID;
/** RPC riêng cho public reads trong luồng sponsored (optional; trống = transport mặc định của chain). */
export const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined;
export const GASLESS = Boolean(PIMLICO_API_KEY);
export const pimlicoUrl = PIMLICO_API_KEY
  ? `https://api.pimlico.io/v2/${activeChain.id}/rpc?apikey=${PIMLICO_API_KEY}`
  : undefined;

/**
 * Cổng nạp fiat (thẻ/PayPal). On-ramp thật đi qua backend engine (POST /onramp/session).
 * Chưa cấu hình backend (NEXT_PUBLIC_API_URL trống) → DEV: mô phỏng checkout + cộng sandbox.
 */
export const ONRAMP_DEV = !process.env.NEXT_PUBLIC_API_URL;

/**
 * Deposit (entry) fee shown in the earn flow, in basis points. DISPLAY-ONLY — the on-chain
 * `ProtocolRegistry.depositFeeBps` is the enforcer (hard-capped at 2%). Keep this in sync with it
 * whenever the on-chain fee is changed; 0 = no fee is shown (the default until the fee is turned on).
 */
export const DEPOSIT_FEE_BPS = Number(process.env.NEXT_PUBLIC_DEPOSIT_FEE_BPS ?? "0");

export const explorerUrl =
  activeChain.blockExplorers?.default.url ?? "https://etherscan.io";

export function explorerAddressUrl(address: string) {
  return `${explorerUrl}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${explorerUrl}/tx/${hash}`;
}
