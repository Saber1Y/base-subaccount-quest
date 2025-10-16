"use client";

import { useState, useCallback } from "react";
import { Address, parseUnits } from "viem";
import { requestSpendPermission } from "@base-org/account/spend-permission";
import { baseAccountSDKConfig } from "@/lib/config";

interface Provider {
  request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
}

export interface SpendPermission {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  start: number;
  end: number;
  salt?: bigint;
  extraData?: `0x${string}`;
}

export interface SpendPermissionStatus {
  hasPermission: boolean;
  permission?: SpendPermission;
  allowance?: bigint;
  isLoading: boolean;
}

const permission = await requestSpendPermission({
  account: "0x...",
  spender: "0x...",
  token: "0x...",
  chainId: 8453, // or any other supported chain
  allowance: 1_000_000n,
  periodInDays: 30,
  provider: baseAccountSDKConfig.getProvider(),
});

export function useSpendPermissions(
  provider: Provider | null,
  userAddress?: Address, // The user's main address
  spenderAddress?: Address // The app's spender address (can be sub account)
) {
  const [permissionStatus, setPermissionStatus] =
    useState<SpendPermissionStatus>({
      hasPermission: false,
      isLoading: false,
    });

  console.log("Spend Permission:", permission);

  // ETH token address (0x0 for native ETH)
  const ETH_TOKEN_ADDRESS =
    "0x0000000000000000000000000000000000000000" as Address;

  /**
   * Request a new spend permission for ETH tipping
   * This will be used to create a seamless tipping experience
   */
  const requestSpendPermissionFlow = useCallback(
    async (
      allowanceEth: number = 0.1, // Default 0.1 ETH allowance
      periodInDays: number = 30 // Default 30 days
    ): Promise<{
      success: boolean;
      permission?: SpendPermission;
      error?: string;
    }> => {
      if (!provider || !userAddress || !spenderAddress) {
        return { success: false, error: "Missing required parameters" };
      }

      try {
        console.log(
          "Requesting spend permission for",
          allowanceEth,
          "ETH for",
          periodInDays,
          "days"
        );

        // Convert ETH to wei
        const allowanceWei = parseUnits(allowanceEth.toString(), 18);

        // Set permission start and end times
        const start = Math.floor(Date.now() / 1000);
        const end = start + periodInDays * 24 * 60 * 60;

        // For now, simulate the permission since we'll integrate with Sub Account
        // In a real implementation, this would call the Base SDK requestSpendPermission
        const permission: SpendPermission = {
          account: userAddress,
          spender: spenderAddress,
          token: ETH_TOKEN_ADDRESS,
          allowance: allowanceWei,
          start,
          end,
          salt: BigInt(Math.floor(Math.random() * 1000000)),
          extraData: "0x" as `0x${string}`,
        };

        // Update local state
        const newStatus = {
          hasPermission: true,
          permission,
          allowance: allowanceWei,
          isLoading: false,
        };
        setPermissionStatus(newStatus);

        return { success: true, permission };
      } catch (error) {
        console.error("Failed to request spend permission:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Permission request failed",
        };
      }
    },
    [provider, userAddress, spenderAddress, ETH_TOKEN_ADDRESS]
  );

  /**
   * Check if we have an existing spend permission
   */
  const checkSpendPermission =
    useCallback(async (): Promise<SpendPermissionStatus> => {
      return permissionStatus;
    }, [permissionStatus]);

  /**
   * Check if a tip amount is within the allowance
   */
  const canTipAmount = useCallback(
    (amountEth: number): boolean => {
      if (!permissionStatus.hasPermission || !permissionStatus.allowance) {
        return false;
      }

      const amountWei = parseUnits(amountEth.toString(), 18);
      return amountWei <= permissionStatus.allowance;
    },
    [permissionStatus]
  );

  /**
   * Deduct an amount from the allowance (to be called after successful tip)
   */
  const deductFromAllowance = useCallback((amountEth: number) => {
    const amountWei = parseUnits(amountEth.toString(), 18);
    setPermissionStatus((prev) => ({
      ...prev,
      allowance: prev.allowance ? prev.allowance - amountWei : BigInt(0),
    }));
  }, []);

  /**
   * Reset/revoke the permission
   */
  const revokePermission = useCallback(() => {
    setPermissionStatus({
      hasPermission: false,
      isLoading: false,
    });
  }, []);

  return {
    permissionStatus,
    requestSpendPermissionFlow,
    checkSpendPermission,
    canTipAmount,
    deductFromAllowance,
    revokePermission,
  };
}
