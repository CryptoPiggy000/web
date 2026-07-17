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
import { toAccount } from "viem/accounts";
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

const toCall = (w: ContractWrite) => ({
  to: w.address,
  value: w.value ?? 0n,
  data: encodeFunctionData({ abi: w.abi, functionName: w.functionName, args: w.args ?? [] }),
});

/**
 * Một cửa gửi giao dịch cho luồng on-chain, với `sendBatch` gộp nhiều lệnh thành 1 chữ ký.
 *
 * - GASLESS (có Pimlico): cả batch thành 1 userOp EIP-7702, phí gas trả qua paymaster.
 *   Lần đầu kèm 1 authorization (uỷ quyền EOA → SimpleAccount impl); các lần sau EOA đã có
 *   code nên bỏ qua. Vì địa chỉ vẫn là EOA, `executePlan`/`withdraw` thấy msg.sender = owner.
 * - Fallback: đặt ví embedded (Privy) làm active rồi tự trả gas bằng ETH; batch chạy tuần tự.
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
    async (writes: ContractWrite[]): Promise<`0x${string}`> => {
      if (!embedded) throw new Error("No embedded wallet");
      if (!pimlicoUrl) throw new Error("Pimlico not configured");
      const eoa = embedded.address as `0x${string}`;

      // Bọc ví Privy thành LocalAccount: có sẵn .address (khỏi eth_requestAccounts), ký định
      // tuyến qua Privy provider. Đây đúng shape owner mà probe đã validate on-chain.
      const privyClient = createWalletClient({
        account: eoa,
        chain: activeChain,
        transport: custom(await embedded.getEthereumProvider()),
      });
      const owner = toAccount({
        address: eoa,
        // privyClient đã bind account: eoa → chữ ký định tuyến qua Privy provider.
        signMessage: ({ message }) => privyClient.signMessage({ message }),
        signTypedData: (typedData) =>
          privyClient.signTypedData(typedData as Parameters<typeof privyClient.signTypedData>[0]),
        signTransaction: () => {
          throw new Error("Smart account signer doesn't sign raw transactions");
        },
      });
      const pub = createPublicClient({ chain: activeChain, transport: http(RPC_URL) });
      const pimlico = createPimlicoClient({ chain: activeChain, transport: http(pimlicoUrl) });

      const account = await to7702SimpleSmartAccount({ client: pub, owner });
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
        account,
        calls: writes.map(toCall),
        ...(authorization ? { authorization } : {}),
        ...(SPONSORSHIP_POLICY_ID
          ? { paymasterContext: { sponsorshipPolicyId: SPONSORSHIP_POLICY_ID } }
          : {}),
      });
    },
    [embedded, signAuthorization],
  );

  const sendPlain = useCallback(
    async (writes: ContractWrite[]): Promise<`0x${string}`> => {
      if (!embedded) throw new Error("No embedded wallet");
      // Ký bằng ví Privy embedded, không phải MetaMask — đặt làm active wallet trước.
      await setActiveWallet(embedded);
      let hash: `0x${string}` | undefined;
      for (const w of writes) {
        hash = await writeContractAsync({
          address: w.address,
          abi: w.abi,
          functionName: w.functionName,
          args: w.args ?? [],
          value: w.value,
        });
        // Không gộp được tx EOA thường → chờ mined để giữ thứ tự (vd createAccount trước executePlan).
        await publicClient?.waitForTransactionReceipt({ hash });
      }
      if (!hash) throw new Error("No calls");
      return hash;
    },
    [embedded, setActiveWallet, writeContractAsync, publicClient],
  );

  const sendBatch = GASLESS ? sendSponsored : sendPlain;

  return {
    gasless: GASLESS,
    sendBatch,
    send: useCallback((write: ContractWrite) => sendBatch([write]), [sendBatch]),
    publicClient,
  };
}
