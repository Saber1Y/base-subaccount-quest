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
      if (!provider) return null;

      try {
        setStatus("Checking for existing Sub Account...");

        // Try multiple methods to get sub accounts
        let response: GetSubAccountsResponse | null = null;

        try {
          response = (await provider.request({
            method: "wallet_getSubAccounts",
            params: [
              {
                account: universalAddr,
                domain: window.location.origin,
              },
            ],
          })) as GetSubAccountsResponse;
        } catch (getError) {
          console.warn(
            "wallet_getSubAccounts failed, trying alternative:",
            getError
          );

          // Fallback method
          try {
            response = (await provider.request({
              method: "wallet_listSubAccounts",
              params: [universalAddr],
            })) as GetSubAccountsResponse;
          } catch (listError) {
            console.warn("wallet_listSubAccounts also failed:", listError);
            setStatus("No existing Sub Account found");
            return null;
          }
        }

        if (
          response &&
          response.subAccounts &&
          response.subAccounts.length > 0
        ) {
          // Find the first valid sub account (different address from EOA)
          const validSubAccount = response.subAccounts.find(
            (subAcc) =>
              subAcc.address &&
              subAcc.address.toLowerCase() !== universalAddr.toLowerCase()
          );

          if (validSubAccount) {
            console.log("Found existing valid Sub Account:", validSubAccount);
            setSubAccount(validSubAccount);
            setStatus("Existing Sub Account found");
            return validSubAccount;
          } else {
            console.warn("Found sub accounts but all have same address as EOA");
            setStatus("No valid Sub Account found");
            return null;
          }
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

  // Fund Sub Account from Base Account (must be defined before createSubAccount)
  const fundSubAccount = useCallback(
    async (amountEth: string = "0.01") => {
      if (!provider || !subAccount || !universalAddress) {
        throw new Error("Provider, Sub Account, or Base Account not available");
      }

      setIsLoading(true);
      setStatus("Funding Sub Account...");

      try {
        // Send ETH from Base Account to Sub Account
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: universalAddress,
              to: subAccount.address,
              value: `0x${(parseFloat(amountEth) * 1e18).toString(16)}`, // Convert ETH to wei in hex
            },
          ],
        });

        setStatus("Sub Account funded successfully!");
        return txHash;
      } catch (error) {
        console.error("Failed to fund sub account:", error);
        setStatus("Failed to fund Sub Account");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [provider, subAccount, universalAddress]
  );

  // Create a new Sub Account - UPDATED VERSION
  const createSubAccount = useCallback(
    async (fundingAmount: string = "0.1") => {
      if (!provider || !universalAddress) {
        throw new Error("Provider or universal address not available");
      }

      setIsCreating(true);
      setStatus("Creating Sub Account...");

      try {
        // Use wallet_grantPermissions to create a smart contract wallet with spending permissions
        const permissionsResponse = (await provider.request({
          method: "wallet_grantPermissions",
          params: [
            {
              permissions: [
                {
                  type: "native-token-transfer",
                  data: {
                    ticker: "ETH",
                  },
                  policies: [
                    {
                      type: "spending-limits",
                      data: {
                        limits: [
                          {
                            limit: `0x${(
                              parseFloat(fundingAmount) * 1e18
                            ).toString(16)}`,
                            period: 86400, // 24 hours in seconds
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
              expiry: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year from now
              signer: {
                type: "account",
                data: {
                  id: window.location.origin,
                },
              },
            },
          ],
        })) as any;

        console.log("Permissions granted:", permissionsResponse);

        // Extract the Sub Account address from the response
        let newSubAccount: SubAccount;

        if (
          permissionsResponse?.grantedPermissions?.[0]?.signer?.data?.address
        ) {
          newSubAccount = {
            address: permissionsResponse.grantedPermissions[0].signer.data
              .address as Address,
            factory: permissionsResponse.factory as Address | undefined,
            factoryData: permissionsResponse.factoryData as
              | `0x${string}`
              | undefined,
          };
        } else if (permissionsResponse?.address) {
          newSubAccount = {
            address: permissionsResponse.address as Address,
            factory: permissionsResponse.factory as Address | undefined,
            factoryData: permissionsResponse.factoryData as
              | `0x${string}`
              | undefined,
          };
        } else {
          throw new Error("No Sub Account address in permissions response");
        }

        // Verify the sub account was created with a different address
        if (
          !newSubAccount.address ||
          newSubAccount.address.toLowerCase() === universalAddress.toLowerCase()
        ) {
          throw new Error(
            "Sub Account creation failed: addresses are identical or invalid. Try using the Coinbase Smart Wallet which has native Sub Account support."
          );
        }

        console.log("Sub Account created successfully:", {
          address: newSubAccount.address,
          factory: newSubAccount.factory,
          factoryData: newSubAccount.factoryData,
          baseAccount: universalAddress,
        });

        // Set the sub account first so fundSubAccount can use it
        setSubAccount(newSubAccount);

        // Now fund the Sub Account from the Base Account
        setStatus("Funding Sub Account...");
        try {
          await fundSubAccount(fundingAmount);
          setStatus("Sub Account funded successfully!");
        } catch (fundError) {
          console.warn("Failed to auto-fund Sub Account:", fundError);
          setStatus("Sub Account created (please fund manually)");
        }

        return newSubAccount;
      } catch (error) {
        console.error("Failed to create sub account:", error);
        setStatus("Failed to create Sub Account");
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [provider, universalAddress, fundSubAccount]
  );

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

  // Get Sub Account ETH balance for debugging
  const getSubAccountBalance = useCallback(async () => {
    if (!provider || !subAccount) {
      return null;
    }

    try {
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [subAccount.address, "latest"],
      });
      return balance;
    } catch (error) {
      console.error("Failed to get sub account balance:", error);
      return null;
    }
  }, [provider, subAccount]);

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
    provider,
    sdk,
    subAccount,
    universalAddress,
    isConnected,
    isCreating,
    isLoading,
    status,
    connectBaseAccount,
    createSubAccount,
    executeFromSubAccount,
    ensureSubAccount,
    checkForExistingSubAccount,
    getSubAccountBalance,
    fundSubAccount,
  };
}
