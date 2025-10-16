"use client";

import { useState, useCallback } from "react";
import { Address, parseUnits } from "viem";
import {
  requestSpendPermission,
  prepareSpendCallData,
  getPermissionStatus,
  requestRevoke,
  prepareRevokeCallData,
} from "@base-org/account/spend-permission/browser";
import { baseSepolia } from "viem/chains";

export interface SpendPermissionStatus {
  hasPermission: boolean;
  permission?: unknown;
  allowance?: bigint;
  isLoading: boolean;
}

interface BaseSDK {
  getProvider: () => {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  };
}

export function useSpendPermissions(
  sdk: BaseSDK | null,
  userAddress?: Address,
  spenderAddress?: Address
) {
  const [permissionStatus, setPermissionStatus] =
    useState<SpendPermissionStatus>({
      hasPermission: false,
      isLoading: false,
    });

  // Use Base Sepolia USDC for reliable spend permissions
  const USDC_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;

  /**
   * Request a new spend permission for ETH tipping using Base SDK
   */
  const requestSpendPermissionFlow = useCallback(
    async (
      allowanceEth: number = 0.1, // Default 0.1 ETH allowance
      periodInDays: number = 30 // Default 30 days
    ): Promise<{
      success: boolean;
      permission?: unknown;
      error?: string;
    }> => {
      if (!sdk || !userAddress || !spenderAddress) {
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

        // Convert to USDC units (6 decimals) - use a reasonable USDC amount
        const allowanceUsdc = parseUnits((allowanceEth * 10).toString(), 6); // Convert 0.1 ETH -> 1 USDC equivalent
        const provider = sdk.getProvider();

        // Use the actual Base SDK requestSpendPermission function
        const permission = await requestSpendPermission({
          account: userAddress,
          spender: spenderAddress,
          token: USDC_TOKEN_ADDRESS,
          chainId: baseSepolia.id,
          allowance: allowanceUsdc,
          periodInDays,
          provider: provider as never, // Type workaround for provider compatibility
        });

        if (permission) {
          // Update local state
          const newStatus = {
            hasPermission: true,
            permission,
            allowance: allowanceUsdc,
            isLoading: false,
          };
          setPermissionStatus(newStatus);

          return { success: true, permission };
        } else {
          return { success: false, error: "Permission request was declined" };
        }
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
    [sdk, userAddress, spenderAddress]
  );

  /**
   * Execute a spend using an existing permission (zero wallet popups)
   */
  const executeSpendTip = useCallback(
    async (
      recipient: Address,
      amountEth: number
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (!sdk || !spenderAddress) {
        return { success: false, error: "Missing required parameters" };
      }

      if (!permissionStatus.hasPermission || !permissionStatus.permission) {
        return { success: false, error: "No spend permission available" };
      }

      try {
        console.log("Executing spend of", amountEth, "ETH to", recipient);

        // Convert ETH to wei
        const amountWei = parseUnits(amountEth.toString(), 18);

        // Check if amount exceeds allowance
        if (
          permissionStatus.allowance &&
          amountWei > permissionStatus.allowance
        ) {
          return {
            success: false,
            error: `Amount (${amountEth} ETH) exceeds allowance (${
              Number(permissionStatus.allowance) / 1e18
            } ETH)`,
          };
        }

        const provider = sdk.getProvider();

        // Prepare spend call data using Base SDK
        const spendCalls = await prepareSpendCallData(
          permissionStatus.permission as never,
          amountWei,
          recipient
        );

        // Execute using wallet_sendCalls for atomic batch transaction
        const result = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "2.0",
              atomicRequired: true,
              from: spenderAddress,
              calls: spendCalls,
            },
          ],
        });

        // Update allowance (subtract spent amount)
        setPermissionStatus((prev) => ({
          ...prev,
          allowance: prev.allowance ? prev.allowance - amountWei : BigInt(0),
        }));

        return { success: true, txHash: result as string };
      } catch (error) {
        console.error("Failed to execute spend:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Spend execution failed",
        };
      }
    },
    [sdk, spenderAddress, permissionStatus]
  );

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
   * Check for existing spend permission
   */
  const checkSpendPermission =
    useCallback(async (): Promise<SpendPermissionStatus> => {
      return permissionStatus;
    }, [permissionStatus]);

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
    executeSpendTip,
    checkSpendPermission,
    canTipAmount,
    revokePermission,
  };
}
