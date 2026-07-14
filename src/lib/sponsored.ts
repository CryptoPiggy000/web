"use client";

import { useCallback } from "react";
import { useWallets, useSign7702Authorization } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useWriteContract, usePublicClient } from "wagmi";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  encodeFunctionData,
  type Abi,
} from "viem";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { activeChain, GASLESS, pimlicoUrl, RPC_URL, SPONSORSHIP_POLICY_ID } from "./chain";

/**
 * SimpleAccount 7702 implementation permissionless delegate tới (mặc định của
 * `to7702SimpleSmartAccount`). Ví embedded được uỷ quyền code này, GIỮ NGUYÊN địa chỉ EOA.
 */
const IMPL_7702 = "0xe6Cae83BdE06E4c305530e199D7217f42808555B" as const;

/** Một lệnh ghi contract, cùng shape với wagmi writeContract để cả 2 đường dùng chung. */
export type ContractWrite = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

/**
 * Một cửa gửi giao dịch duy nhất cho luồng on-chain.
 *
 * - GASLESS (có Pimlico): gói lệnh thành 1 userOp EIP-7702, phí gas trả qua paymaster.
 *   Lần đầu ký 1 authorization (uỷ quyền EOA → SimpleAccount impl); các lần sau EOA đã có
 *   code nên bỏ qua. Vì địa chỉ vẫn là EOA, `executePlan`/`withdraw` thấy msg.sender = owner.
 * - Fallback: đặt ví embedded (Privy, KHÔNG phải MetaMask) làm active rồi tự trả gas bằng ETH.
 *
 * Cả hai trả về tx hash on-chain.
 */
export function useTxSender() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { setActiveWallet } = useSetActiveWallet();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const embedded = wallets.find((w) => w.walletClientType === "privy");

  const sendSponsored = useCallback(
    async (write: ContractWrite): Promise<`0x${string}`> => {
      if (!embedded) throw new Error("No embedded wallet");
      if (!pimlicoUrl) throw new Error("Pimlico not configured");
      const eoa = embedded.address as `0x${string}`;

      const owner = createWalletClient({
        account: eoa,
        chain: activeChain,
        transport: custom(await embedded.getEthereumProvider()),
      });
      const pub = createPublicClient({ chain: activeChain, transport: http(RPC_URL) });
      const pimlico = createPimlicoClient({ chain: activeChain, transport: http(pimlicoUrl) });

      // Pass `address` tường minh — nếu không permissionless gọi eth_requestAccounts qua provider.
      const account = await to7702SimpleSmartAccount({ client: pub, owner, address: eoa });
      const smart = createSmartAccountClient({
        account,
        chain: activeChain,
        paymaster: pimlico,
        bundlerTransport: http(pimlicoUrl),
        userOperation: {
          estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
        },
      });

      // Chỉ ký authorization khi EOA CHƯA được delegate (code bắt đầu bằng 0xef0100 = 7702).
      const code = await pub.getCode({ address: eoa });
      const delegated = code?.toLowerCase().startsWith("0xef0100") ?? false;
      const authorization = delegated
        ? undefined
        : await signAuthorization({
            contractAddress: IMPL_7702,
            chainId: activeChain.id,
            nonce: await pub.getTransactionCount({ address: eoa }),
          });

      return smart.sendTransaction({
        to: write.address,
        value: write.value ?? 0n,
        data: encodeFunctionData({
          abi: write.abi,
          functionName: write.functionName,
          args: write.args ?? [],
        }),
        ...(authorization ? { authorization } : {}),
        ...(SPONSORSHIP_POLICY_ID
          ? { paymasterContext: { sponsorshipPolicyId: SPONSORSHIP_POLICY_ID } }
          : {}),
      });
    },
    [embedded, signAuthorization],
  );

  const sendPlain = useCallback(
    async (write: ContractWrite): Promise<`0x${string}`> => {
      if (!embedded) throw new Error("No embedded wallet");
      // Ký bằng ví Privy embedded, không phải MetaMask — đặt làm active wallet trước.
      await setActiveWallet(embedded);
      return writeContractAsync({
        address: write.address,
        abi: write.abi,
        functionName: write.functionName,
        args: write.args ?? [],
        value: write.value,
      });
    },
    [embedded, setActiveWallet, writeContractAsync],
  );

  return {
    gasless: GASLESS,
    send: GASLESS ? sendSponsored : sendPlain,
    publicClient,
  };
}
