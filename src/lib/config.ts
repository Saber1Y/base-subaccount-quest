import { base } from "viem/chains";
import type { Chain } from "viem";

export const BASE_MAINNET_CHAIN_ID = 8453;

export const supportedChains: Chain[] = [base];

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  config: {
    appearance: {
      theme: "light",
      accentColor: "#0052FF", // Base blue
      logo: "https://base.org/favicon.ico",
    },

    defaultChain: base,
    supportedChains: supportedChains,
    embeddedWallets: {
      createOnLogin: "users-without-wallets",
    },
  },
};

export const baseAccountConfig = {
  apiKey: process.env.NEXT_PUBLIC_BASE_ACCOUNT_API_KEY,
  chain: base,
};

export const baseAccountSDKConfig = {
  appName: "InstaZora",
  appLogoUrl: "https://base.org/favicon.ico",
  appChainIds: [base.id],
  subAccounts: {
    creation: "manual" as const,
    defaultAccount: "sub" as const,
    funding: "auto" as const,
  },
  // Add paymaster for sponsored gas (optional)
  // paymasterUrls: {
  //   [baseSepolia.id]: 'your-paymaster-url'
  // }
};
