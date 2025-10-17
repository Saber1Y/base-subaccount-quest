"use client";

import { useCallback } from "react";
import { Address, parseUnits } from "viem";

import type { SubAccount } from "./useSubAccount";

export interface TipResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amount?: string;
}

export function useCreatorTipping(
  subAccount: SubAccount | null,
  executeFromSubAccount:
    | ((
        calls: Array<{ to: string; data: string; value: string }>
      ) => Promise<string>)
    | undefined
) {
  /**
   * Tip a creator with ETH (direct ETH amounts)
   */
  const tipCreator = useCallback(
    async (
      creatorAddress: Address,
      tipAmountEth: number = 0.001 // Direct ETH amount
    ): Promise<TipResult> => {
      if (!subAccount || !executeFromSubAccount) {
        throw new Error("Sub Account or execution function not available");
      }

      try {
        // Use the ETH amount directly
        const ethAmount = tipAmountEth.toFixed(4);

        console.log(`Tipping creator ${creatorAddress} with ${ethAmount} ETH`);

        // Convert ETH amount to wei
        const tipAmountWei = parseUnits(ethAmount, 18);

        // Balance validation is done in the calling component (page.tsx)

        // Execute ETH transfer via Sub Account
        const callsId = await executeFromSubAccount([
          {
            to: creatorAddress,
            data: "0x", // No data needed for ETH transfer
            value: `0x${tipAmountWei.toString(16)}`, // ETH amount in hex
          },
        ]);

        return {
          success: true,
          txHash: callsId,
          amount: `${ethAmount} ETH`,
        };
      } catch (error) {
        console.error("Tip failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tip failed",
        };
      }
    },
    [executeFromSubAccount, subAccount]
  );

  /**
   * Get Sub Account's ETH balance (placeholder - use getSubAccountBalance from useSubAccount instead)
   */
  const getETHBalance = useCallback(async (): Promise<number> => {
    // This function is deprecated - balance checking is done via getSubAccountBalance
    console.warn(
      "getETHBalance is deprecated - use getSubAccountBalance from useSubAccount"
    );
    return 0;
  }, []);

  /**
   * Quick tip presets (direct ETH amounts)
   */
  const quickTip = useCallback(
    async (
      creatorAddress: Address,
      preset: "coffee" | "beer" | "pizza" | "custom",
      customAmount?: number
    ): Promise<TipResult> => {
      const amounts = {
        coffee: 0.001, // 0.001 ETH
        beer: 0.005, // 0.005 ETH
        pizza: 0.01, // 0.01 ETH
        custom: customAmount || 0.0005,
      };

      return tipCreator(creatorAddress, amounts[preset]);
    },
    [tipCreator]
  );

  return {
    tipCreator,
    quickTip,
    getETHBalance,
  };
}
