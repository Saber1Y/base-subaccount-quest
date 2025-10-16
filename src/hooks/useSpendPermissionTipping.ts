"use client";

import { useCallback } from "react";
import { Address, parseUnits } from "viem";
import { 
  prepareSpendCallData,
  getPermissionStatus,
  type SpendPermission
} from "@base-org/account/spend-permission";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/config";

/**
 * Hook for tipping creators using spend permissions
 * This follows the Base documentation pattern exactly
 */
export function useSpendPermissionTipping(
  provider: ReturnType<ReturnType<typeof import("@base-org/account")["createBaseAccountSDK"]>["getProvider"]> | null,
  spenderAddress: Address // The address that has spend permission (Sub Account)
) {

  /**
   * Execute a tip using spend permission
   * This creates a permission that moves funds from user's Base Account to the creator
   */
  const executeTipWithPermission = useCallback(async (
    permission: SpendPermission,
    creatorAddress: Address,
    tipAmountEth: number
  ): Promise<string> => {
    if (!provider) {
      throw new Error("Provider not available");
    }

    const tipAmountWei = parseUnits(tipAmountEth.toString(), 18);

    try {
      // Check if permission has enough allowance
      const status = await getPermissionStatus(permission);
      if (!status.isActive || status.remainingSpend < tipAmountWei) {
        throw new Error("Insufficient spend permission allowance");
      }

      // Prepare the spend calls - this will create calls to:
      // 1. Register the permission on-chain (if first time)
      // 2. Transfer ETH from user's Base Account to creator
      const spendCalls = await prepareSpendCallData({
        permission,
        amount: tipAmountWei,
      });

      console.log("Executing tip via spend permission:", {
        creator: creatorAddress,
        amount: tipAmountEth,
        calls: spendCalls
      });

      // The key insight: we need to modify the spend calls to send to the creator
      // The spend permission moves funds from user account to spender, 
      // then spender sends to creator
      const tipCalls = [
        // First, execute the spend permission calls to get funds to spender
        ...spendCalls,
        // Then, transfer from spender to creator
        {
          to: creatorAddress,
          data: "0x",
          value: `0x${tipAmountWei.toString(16)}`,
        }
      ];

      // Execute using wallet_sendCalls from the spender address
      const result = await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: "2.0",
            atomicRequired: true,
            from: spenderAddress,
            calls: tipCalls,
            chainId: `0x${BASE_SEPOLIA_CHAIN_ID.toString(16)}`,
          },
        ],
      });

      console.log("Tip executed successfully via spend permission:", result);
      return result as string;
    } catch (error) {
      console.error("Failed to execute tip with spend permission:", error);
      throw error;
    }
  }, [provider, spenderAddress]);

  return {
    executeTipWithPermission,
  };
}
