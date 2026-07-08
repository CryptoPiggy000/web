"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { erc20Abi, parseAbi, zeroHash } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS } from "./chain";

const factoryAbi = parseAbi([
  "function predict(address owner_, bytes32 userSalt) view returns (address)",
]);

/**
 * Địa chỉ heo đất + số dư USDC.
 * - Chưa có factory trên chain (Phase 0): heo đất = chính ví embedded.
 * - Có FACTORY_ADDRESS: heo đất = địa chỉ counterfactual từ predict(owner, 0).
 */
export function usePiggy() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const owner = embedded?.address as `0x${string}` | undefined;

  const predicted = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "predict",
    args: owner ? [owner, zeroHash] : undefined,
    query: { enabled: Boolean(FACTORY_ADDRESS && owner) },
  });

  const piggyAddress = (FACTORY_ADDRESS ? predicted.data : owner) as
    | `0x${string}`
    | undefined;

  const balance = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: piggyAddress ? [piggyAddress] : undefined,
    query: {
      enabled: Boolean(USDC_ADDRESS && piggyAddress),
      refetchInterval: 5_000,
    },
  });

  return {
    ready,
    authenticated,
    user,
    owner,
    piggyAddress,
    balance: balance.data ?? 0n,
    balanceLoading: balance.isLoading,
    refetchBalance: balance.refetch,
  };
}
