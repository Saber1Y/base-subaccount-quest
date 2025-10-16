"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { http, createConfig } from "wagmi";

// Create wagmi config
const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// Create a client for react-query
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={
            process.env.NEXT_PUBLIC_PRIVY_APP_ID || "clpispdty00ycl60fpjsq8s8k"
          }
          config={{
            appearance: {
              theme: "light",
              accentColor: "#0052FF",
              logo: "https://base.org/favicon.ico",
            },
            defaultChain: baseSepolia,
            supportedChains: [baseSepolia],
            embeddedWallets: {
              ethereum: {
                createOnLogin: "users-without-wallets",
              },
            },
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
