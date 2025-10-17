"use client";

import { useState, useCallback } from "react";
import { Address, parseUnits } from "viem";
import {
  requestSpendPermission,
  prepareSpendCallData,
  getPermissionStatus,
} from "@base-org/account/spend-permission/browser";
import { baseSepolia } from "viem/chains";

export interface SpendPermissionStatus {
  hasPermission: boolean;
  permission?: unknown;
  allowance?: bigint;
  isLoading: boolean;
  startTime?: number; // Add start time tracking
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

  // ETH token address - ERC-7528 format for Base
  const ETH_TOKEN_ADDRESS =
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

  /**
   * Request a new spend permission for ETH tipping using Base SDK
   */
  const requestSpendPermissionFlow = useCallback(
    async (
      allowanceEth: number = 0.1,
      periodInDays: number = 30
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

        const allowanceWei = parseUnits(allowanceEth.toString(), 18);
        const provider = sdk.getProvider();

        console.log("Requesting with params:", {
          account: userAddress,
          spender: spenderAddress,
          token: ETH_TOKEN_ADDRESS,
          chainId: baseSepolia.id,
          allowance: allowanceWei.toString(),
          periodInDays,
        });

        // Use the SDK exactly as documented - it handles all timing automatically
        const permission = await requestSpendPermission({
          account: userAddress,
          spender: spenderAddress,
          token: ETH_TOKEN_ADDRESS,
          chainId: baseSepolia.id,
          allowance: allowanceWei,
          periodInDays, // Use periodInDays parameter (not period, start, end)
          provider: provider as never,
        });

        if (permission) {
          // Extract start time from permission to track when it becomes active
          const permissionData = permission as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          const startTime = permissionData?.start || 0;

          const newStatus = {
            hasPermission: true,
            permission,
            allowance: allowanceWei,
            isLoading: false,
            startTime, // Store when permission becomes active
          };
          setPermissionStatus(newStatus);

          console.log("Spend permission granted successfully!", {
            ...newStatus,
            startTime,
            currentTime: Math.floor(Date.now() / 1000),
            secondsUntilActive: Math.max(
              0,
              startTime - Math.floor(Date.now() / 1000)
            ),
          });
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
   * Execute a tip using spend permission following the docs pattern exactly
   */
  const executeSpendTip = useCallback(
    async (
      recipient: Address,
      amountEth: number,
      customPermission?: unknown
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (!sdk || !spenderAddress) {
        return { success: false, error: "Missing required parameters" };
      }

      const permission = customPermission || permissionStatus.permission;
      
      if (!permission) {
        return { success: false, error: "No spend permission available" };
      }

      try {
        console.log("Executing tip of", amountEth, "ETH to", recipient);
        const amountWei = parseUnits(amountEth.toString(), 18);
        const provider = sdk.getProvider();

        // Check the status of permission with timing retry logic
        let isActive = false;
        let remainingSpend = BigInt(0);
        
        try {
          const permissionStatus = await getPermissionStatus(permission as never);
          isActive = permissionStatus.isActive;
          remainingSpend = permissionStatus.remainingSpend;
          
          console.log("Permission status:", { isActive, remainingSpend: remainingSpend.toString() });
          
        } catch (error) {
          console.error("Failed to check permission status:", error);
          
          // Check if it's a timing error
          if (error instanceof Error && error.message.includes("BeforeSpendPermissionStart")) {
            console.log("Permission not yet active, extracting timing info...");
            
            // Extract timestamps from error message
            const match = error.message.match(/\((\d+),\s*(\d+)\)/);
            if (match) {
              const currentTime = parseInt(match[1]);
              const startTime = parseInt(match[2]);
              const waitTime = (startTime - currentTime) * 1000; // Convert to milliseconds
              
              console.log(`Permission will be active in ${waitTime / 1000} seconds`);
              
              if (waitTime > 0 && waitTime < 120000) { // Only wait up to 2 minutes
                return { 
                  success: false, 
                  error: `Permission activating in ${Math.ceil(waitTime / 1000)} seconds. Please try again in a moment.` 
                };
              }
            }
          }
          
          return { 
            success: false, 
            error: "Failed to check permission status" 
          };
        }
        
        if (!isActive || remainingSpend < amountWei) {
          return { 
            success: false, 
            error: "No active spend permission with sufficient allowance" 
          };
        }

        // Prepare the calls (following docs pattern) 
        const spendCalls = await prepareSpendCallData(
          permission as never,
          amountWei
        );

        console.log("Prepared spend calls:", spendCalls);

        // Add tip transfer from spender to recipient
        const tipCall = {
          to: recipient,
          value: `0x${amountWei.toString(16)}`,
          data: "0x",
        };

        // Combine spend calls with tip transfer for atomic execution
        const allCalls = [...spendCalls, tipCall];

        // Execute the calls using wallet_sendCalls (following docs pattern)
        const result = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "2.0",
              atomicRequired: true,
              from: spenderAddress,
              calls: allCalls,
            },
          ],
        });

        // Update allowance (subtract spent amount)
        setPermissionStatus((prev) => ({
          ...prev,
          allowance: prev.allowance ? prev.allowance - amountWei : BigInt(0),
        }));

        console.log("Tip executed successfully:", result);
        return { success: true, txHash: result as string };

      } catch (error) {
        console.error("Failed to execute tip:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tip execution failed",
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
