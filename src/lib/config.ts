import { baseSepolia } from "viem/chains";
import type { Chain } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const supportedChains: Chain[] = [baseSepolia];

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  config: {
    appearance: {
      theme: "light",
      accentColor: "#0052FF", // Base blue
      logo: "https://base.org/favicon.ico",
    },
    defaultChain: baseSepolia,
    supportedChains: supportedChains,
    embeddedWallets: {
      createOnLogin: "users-without-wallets",
    },
  },
};

export const baseAccountConfig = {
  apiKey: process.env.NEXT_PUBLIC_BASE_ACCOUNT_API_KEY,
  chain: baseSepolia,
};

export const baseAccountSDKConfig = {
  appName: "CreatorCoins",
  appLogoUrl: "https://base.org/favicon.ico",
  appChainIds: [baseSepolia.id],
  // Remove invalid subAccounts config - handle Sub Account creation manually
};
