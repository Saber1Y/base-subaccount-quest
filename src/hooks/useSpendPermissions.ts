"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  requestSpendPermission,
  prepareSpendCallData,
  fetchPermissions,
  getPermissionStatus,
  requestRevoke,
  type SpendPermission
} from "@base-org/account/spend-permission";
import type { Address } from "viem";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/config";

export interface SpendPermissionStatus {
  isActive: boolean;
  remainingSpend: bigint;
}

export function useSpendPermissions(
  provider: ReturnType<ReturnType<typeof import("@base-org/account")["createBaseAccountSDK"]>["getProvider"]> | null,
  userBaseAccount: Address | null,
  appSpenderAddress: Address
) {
  const [permissions, setPermissions] = useState<SpendPermission[]>([]);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Native ETH token address (0x0 for native token)
  const ETH_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

  /**
   * Fetch existing spend permissions for the user
   */
  const fetchUserPermissions = useCallback(async () => {
    if (!provider || !userBaseAccount) return;

    try {
      const userPermissions = await fetchPermissions({
        account: userBaseAccount,
        chainId: BASE_SEPOLIA_CHAIN_ID,
        spender: appSpenderAddress,
        provider,
      });

      setPermissions(userPermissions);
      return userPermissions;
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      return [];
    }
  }, [provider, userBaseAccount, appSpenderAddress]);

  /**
   * Check if we have an active spend permission with enough allowance
   */
  const checkPermissionStatus = useCallback(async (
    permission: SpendPermission,
    requiredAmount: bigint
  ): Promise<SpendPermissionStatus> => {
    try {
      const status = await getPermissionStatus(permission);
      return {
        isActive: status.isActive && status.remainingSpend >= requiredAmount,
        remainingSpend: status.remainingSpend,
      };
    } catch (error) {
      console.error("Failed to check permission status:", error);
      return { isActive: false, remainingSpend: 0n };
    }
  }, []);

  /**
   * Find a suitable permission for a given amount, or return null
   */
  const findSuitablePermission = useCallback(async (
    requiredAmount: bigint
  ): Promise<SpendPermission | null> => {
    const userPermissions = await fetchUserPermissions();
    
    for (const permission of userPermissions) {
      const status = await checkPermissionStatus(permission, requiredAmount);
      if (status.isActive) {
        return permission;
      }
    }
    
    return null;
  }, [fetchUserPermissions, checkPermissionStatus]);

  /**
   * Request a new spend permission from the user
   */
  const requestNewSpendPermission = useCallback(async (
    allowanceEth: number,
    periodInDays: number = 30
  ): Promise<SpendPermission | null> => {
    if (!provider || !userBaseAccount) {
      throw new Error("Provider or user account not available");
    }

    setIsRequestingPermission(true);
    setPermissionError(null);

    try {
      // Convert ETH to wei
      const allowanceWei = BigInt(Math.floor(allowanceEth * 1e18));

      console.log(`Requesting spend permission: ${allowanceEth} ETH for ${periodInDays} days`);

      const permission = await requestSpendPermission({
        account: userBaseAccount,
        spender: appSpenderAddress,
        token: ETH_TOKEN_ADDRESS,
        chainId: BASE_SEPOLIA_CHAIN_ID,
        allowance: allowanceWei,
        periodInDays,
        provider,
      });

      console.log("Spend permission granted:", permission);

      // Refresh permissions list
      await fetchUserPermissions();

      return permission;
    } catch (error) {
      console.error("Failed to request spend permission:", error);
      const errorMessage = error instanceof Error ? error.message : "Permission request failed";
      setPermissionError(errorMessage);
      throw error;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [provider, userBaseAccount, appSpenderAddress, fetchUserPermissions]);

  /**
   * Execute a tip directly using spend permission
   * The permission allows spending ETH from Base Account directly to the creator
   */
  const executeTipWithPermission = useCallback(async (
    permission: SpendPermission,
    amount: bigint,
    creatorAddress: Address
  ): Promise<string> => {
    if (!provider) {
      throw new Error("Provider not available");
    }

    try {
      // Prepare spend calls that transfer ETH directly from Base Account to creator
      const spendCalls = await prepareSpendCallData(
        permission,
        amount,
        creatorAddress // The recipient - creator gets the ETH directly!
      );

      console.log("Executing spend permission to tip creator directly:", {
        creator: creatorAddress,
        amount: amount.toString(),
        calls: spendCalls
      });

      // Execute using wallet_sendCalls from the spender address (Sub Account)
      const result = await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: "2.0",
            atomicRequired: true,
            from: appSpenderAddress,
            calls: spendCalls,
            chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`,
          },
        ],
      });

      console.log("Tip executed successfully using spend permission:", result);
      return result as string;
    } catch (error) {
      console.error("Failed to execute tip with spend permission:", error);
      throw error;
    }
  }, [provider, appSpenderAddress]);

  /**
   * Revoke a spend permission
   */
  const revokePermission = useCallback(async (
    permission: SpendPermission
  ): Promise<void> => {
    if (!provider) {
      throw new Error("Provider not available");
    }

    try {
      await requestRevoke(permission);
      await fetchUserPermissions(); // Refresh the list
    } catch (error) {
      console.error("Failed to revoke permission:", error);
      throw error;
    }
  }, [provider, fetchUserPermissions]);

  // Load permissions on mount
  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  return {
    permissions,
    isRequestingPermission,
    permissionError,
    requestNewSpendPermission,
    findSuitablePermission,
    executeTipWithPermission,
    revokePermission,
    fetchUserPermissions,
    checkPermissionStatus,
  };
}
