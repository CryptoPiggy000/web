"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { base, foundry, sepolia } from "viem/chains";
import { activeChain } from "@/lib/chain";

const wagmiConfig = createConfig({
  chains: [sepolia, base, foundry],
  transports: {
    [sepolia.id]: http(),
    [base.id]: http(),
    [foundry.id]: http("http://127.0.0.1:8545"), // local anvil demo
  },
});

const queryClient = new QueryClient();

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Thiếu cấu hình Privy</h1>
      <p className="text-muted">
        Tạo app tại{" "}
        <a className="underline" href="https://dashboard.privy.io" target="_blank" rel="noreferrer">
          dashboard.privy.io
        </a>{" "}
        rồi đặt <code className="font-mono text-sm">NEXT_PUBLIC_PRIVY_APP_ID</code> trong{" "}
        <code className="font-mono text-sm">.env.local</code> (xem .env.example).
      </p>
    </main>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!APP_ID) return <SetupNotice />;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#1f5c49",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: activeChain,
        supportedChains: [sepolia, base, foundry],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
