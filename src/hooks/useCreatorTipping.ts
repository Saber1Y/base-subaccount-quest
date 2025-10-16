"use client";

import { useCallback } from "react";
import { Address, encodeFunctionData, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { useSubAccount } from "./useSubAccount";

// USDC contract on Base mainnet
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

// Standard ERC20 ABI for transfer
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface TipResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amount?: string;
}

export function useCreatorTipping() {
  const publicClient = usePublicClient();
  const { executeFromSubAccount, subAccount } = useSubAccount();

  /**
   * Tip a creator with USDC
   */
  const tipCreator = useCallback(
    async (
      creatorAddress: Address,
      tipAmountUsd: number = 1 // Default $1 tip
    ): Promise<TipResult> => {
      if (!publicClient || !subAccount) {
        throw new Error("Client or Sub Account not available");
      }

      try {
        console.log(
          `Tipping creator ${creatorAddress} with $${tipAmountUsd} USDC`
        );

        // Convert USD amount to USDC units (6 decimals for USDC)
        const tipAmount = parseUnits(tipAmountUsd.toString(), 6);

        // Check Sub Account's USDC balance
        const balance = (await publicClient.readContract({
          address: USDC_BASE,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [subAccount.address as Address],
        })) as bigint;

        if (balance < tipAmount) {
          throw new Error(
            `Insufficient USDC balance. Need $${tipAmountUsd}, have $${(
              Number(balance) / 1e6
            ).toFixed(2)}`
          );
        }

        // Encode the transfer transaction
        const transferData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [creatorAddress, tipAmount],
        });

        // Execute tip via Sub Account
        const callsId = await executeFromSubAccount([
          {
            to: USDC_BASE,
            data: transferData,
            value: "0", // No ETH needed for USDC transfer
          },
        ]);

        return {
          success: true,
          txHash: callsId,
          amount: `$${tipAmountUsd} USDC`,
        };
      } catch (error) {
        console.error("Tip failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tip failed",
        };
      }
    },
    [publicClient, executeFromSubAccount, subAccount]
  );

  /**
   * Get Sub Account's USDC balance
   */
  const getUSDCBalance = useCallback(async (): Promise<number> => {
    if (!publicClient || !subAccount) {
      return 0;
    }

    try {
      const balance = (await publicClient.readContract({
        address: USDC_BASE,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [subAccount.address as Address],
      })) as bigint;

      // Convert from 6 decimals to USD
      return Number(balance) / 1e6;
    } catch (error) {
      console.error("Failed to get USDC balance:", error);
      return 0;
    }
  }, [publicClient, subAccount]);

  /**
   * Quick tip presets
   */
  const quickTip = useCallback(
    async (
      creatorAddress: Address,
      preset: "coffee" | "beer" | "pizza" | "custom",
      customAmount?: number
    ): Promise<TipResult> => {
      const amounts = {
        coffee: 3, // $3
        beer: 5, // $5
        pizza: 10, // $10
        custom: customAmount || 1,
      };

      return tipCreator(creatorAddress, amounts[preset]);
    },
    [tipCreator]
  );

  return {
    tipCreator,
    quickTip,
    getUSDCBalance,
    USDC_CONTRACT: USDC_BASE,
  };
}
