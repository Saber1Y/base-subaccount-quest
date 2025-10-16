"use client";

import { useState, useCallback, useEffect } from "react";
import { createBaseAccountSDK } from "@base-org/account";
import { baseAccountSDKConfig } from "@/lib/config";
import type { Address } from "viem";

export interface SubAccount {
  address: Address;
  factory?: Address;
  factoryData?: `0x${string}`;
}

interface GetSubAccountsResponse {
  subAccounts: SubAccount[];
}

interface WalletAddSubAccountResponse {
  address: Address;
  factory?: Address;
  factoryData?: `0x${string}`;
}

export function useSubAccount() {
  const [provider, setProvider] = useState<ReturnType<
    ReturnType<typeof createBaseAccountSDK>["getProvider"]
  > | null>(null);
  const [sdk, setSdk] = useState<ReturnType<
    typeof createBaseAccountSDK
  > | null>(null);
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [universalAddress, setUniversalAddress] = useState<Address | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // Initialize Base Account SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const sdkInstance = createBaseAccountSDK(baseAccountSDKConfig as any);
        const providerInstance = sdkInstance.getProvider();

        setSdk(sdkInstance);
        setProvider(providerInstance);
        setStatus("Ready to connect");
      } catch (error) {
        console.error("Failed to initialize Base Account SDK:", error);
        setStatus("Failed to initialize SDK");
      }
    };

    initializeSDK();
  }, []);

  // Check if user already has a Sub Account for this app
  const checkForExistingSubAccount = useCallback(
    async (universalAddr: Address) => {
      if (!provider) return;

      try {
        setStatus("Checking for existing Sub Account...");

        const response = (await provider.request({
          method: "wallet_getSubAccounts",
          params: [
            {
              account: universalAddr,
              domain: window.location.origin,
            },
          ],
        })) as GetSubAccountsResponse;

        const existingSubAccount = response.subAccounts[0];
        if (existingSubAccount) {
          setSubAccount(existingSubAccount);
          setStatus("Existing Sub Account found");
          return existingSubAccount;
        } else {
          setStatus("No existing Sub Account found");
          return null;
        }
      } catch (error) {
        console.error("Failed to check for existing sub account:", error);
        setStatus("Error checking Sub Account");
        return null;
      }
    },
    [provider]
  );

  // Connect to Base Account
  const connectBaseAccount = useCallback(async () => {
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    setIsLoading(true);
    setStatus("Connecting to Base Account...");

    try {
      // Connect to Base Account
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];

      const universalAddr = accounts[0] as Address;
      setUniversalAddress(universalAddr);
      setIsConnected(true);
      setStatus("Connected to Base Account");

      // Check for existing sub account
      await checkForExistingSubAccount(universalAddr);

      return universalAddr;
    } catch (error) {
      console.error("Failed to connect Base Account:", error);
      setStatus("Failed to connect");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [provider, checkForExistingSubAccount]);

  // Create a new Sub Account
  const createSubAccount = useCallback(async () => {
    if (!provider || !universalAddress) {
      throw new Error("Provider or universal address not available");
    }

    setIsCreating(true);
    setStatus("Creating Sub Account...");

    try {
      const newSubAccount = (await provider.request({
        method: "wallet_addSubAccount",
        params: [
          {
            account: {
              type: "create",
            },
          },
        ],
      })) as WalletAddSubAccountResponse;

      setSubAccount(newSubAccount);
      setStatus("Sub Account created successfully!");
      return newSubAccount;
    } catch (error) {
      console.error("Failed to create sub account:", error);
      setStatus("Failed to create Sub Account");
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [provider, universalAddress]);

  // Execute a transaction from Sub Account (for NFT minting)
  const executeFromSubAccount = useCallback(
    async (calls: Array<{ to: string; data: string; value: string }>) => {
      if (!provider || !subAccount) {
        throw new Error("Provider or Sub Account not available");
      }

      setIsLoading(true);
      setStatus("Executing transaction...");

      try {
        const callsId = (await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "2.0",
              atomicRequired: true,
              from: subAccount.address,
              calls,
              capabilities: {
                // Add paymaster URL here if available
                // paymasterUrl: "your-paymaster-url",
              },
            },
          ],
        })) as string;

        setStatus("Transaction executed successfully!");
        return callsId;
      } catch (error) {
        console.error("Failed to execute transaction:", error);
        setStatus("Transaction failed");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [provider, subAccount]
  );

  // Convenience method to get or create Sub Account
  const ensureSubAccount = useCallback(async () => {
    if (!isConnected) {
      await connectBaseAccount();
    }

    if (!subAccount && universalAddress) {
      const existing = await checkForExistingSubAccount(universalAddress);
      if (!existing) {
        return await createSubAccount();
      }
      return existing;
    }

    return subAccount;
  }, [
    isConnected,
    subAccount,
    universalAddress,
    connectBaseAccount,
    checkForExistingSubAccount,
    createSubAccount,
  ]);

  return {
    // State
    provider,
    sdk,
    subAccount,
    universalAddress,
    isConnected,
    isCreating,
    isLoading,
    status,

    // Actions
    connectBaseAccount,
    createSubAccount,
    executeFromSubAccount,
    ensureSubAccount,
    checkForExistingSubAccount,
  };
}
