"use client";

import { useCallback } from "react";
import { Address, encodeFunctionData } from "viem";
import { usePublicClient } from "wagmi";
import { useSubAccount } from "./useSubAccount";

export interface TradeParams {
  coinAddress: Address;
  amount: bigint;
  recipient: Address;
  slippage?: number; // basis points, e.g., 100 for 1%
  maxPayment?: bigint; // max ETH to spend (for buys)
  minReceived?: bigint; // min ETH to receive (for sells)
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amountOut?: bigint;
  priceImpact?: number;
}

// Zora ERC20Z ABI - focusing on trading functions
const ERC20Z_ABI = [
  {
    name: "purchase",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "quantity", type: "uint256" },
      { name: "comment", type: "string" },
      { name: "mintReferral", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "sell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "getEthPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "numTokens", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getSaleProceeds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "numTokens", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useZoraTrading() {
  const publicClient = usePublicClient();
  const { executeFromSubAccount, subAccount } = useSubAccount();

  /**
   * Buy creator coins using ETH
   */
  const buyCoin = useCallback(
    async (params: TradeParams): Promise<TradeResult> => {
      if (!publicClient || !subAccount) {
        throw new Error("Client or Sub Account not available");
      }

      try {
        console.log("Preparing buy transaction for coin:", params.coinAddress);

        // Get the current price for the amount of tokens we want to buy
        const ethPrice = (await publicClient.readContract({
          address: params.coinAddress,
          abi: ERC20Z_ABI,
          functionName: "getEthPrice",
          args: [params.amount],
        })) as bigint;

        // Add slippage protection (default 1%)
        const slippageBasisPoints = params.slippage || 100; // 1%
        const maxPayment =
          params.maxPayment ||
          (ethPrice * BigInt(10000 + slippageBasisPoints)) / BigInt(10000);

        console.log(
          `Buying ${params.amount} tokens for ${ethPrice} ETH (max: ${maxPayment})`
        );

        // Encode the purchase transaction
        const purchaseData = encodeFunctionData({
          abi: ERC20Z_ABI,
          functionName: "purchase",
          args: [
            params.recipient,
            params.amount,
            "", // empty comment
            "0x0000000000000000000000000000000000000000", // no referral
          ],
        });

        // Execute via Sub Account
        const callsId = await executeFromSubAccount([
          {
            to: params.coinAddress,
            data: purchaseData,
            value: maxPayment.toString(),
          },
        ]);

        return {
          success: true,
          txHash: callsId,
          amountOut: params.amount,
          priceImpact:
            Number(((maxPayment - ethPrice) * BigInt(10000)) / ethPrice) / 100,
        };
      } catch (error) {
        console.error("Buy transaction failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Buy failed",
        };
      }
    },
    [publicClient, executeFromSubAccount, subAccount]
  );

  /**
   * Sell creator coins for ETH
   */
  const sellCoin = useCallback(
    async (params: TradeParams): Promise<TradeResult> => {
      if (!publicClient || !subAccount) {
        throw new Error("Client or Sub Account not available");
      }

      try {
        console.log("Preparing sell transaction for coin:", params.coinAddress);

        // Check user's balance first
        const balance = (await publicClient.readContract({
          address: params.coinAddress,
          abi: ERC20Z_ABI,
          functionName: "balanceOf",
          args: [subAccount.address as Address],
        })) as bigint;

        if (balance < params.amount) {
          throw new Error(
            `Insufficient balance. Have ${balance}, need ${params.amount}`
          );
        }

        // Get the expected ETH output for selling
        const ethProceeds = (await publicClient.readContract({
          address: params.coinAddress,
          abi: ERC20Z_ABI,
          functionName: "getSaleProceeds",
          args: [params.amount],
        })) as bigint;

        // Add slippage protection
        const slippageBasisPoints = params.slippage || 100; // 1%
        const minReceived =
          params.minReceived ||
          (ethProceeds * BigInt(10000 - slippageBasisPoints)) / BigInt(10000);

        console.log(
          `Selling ${params.amount} tokens for ${ethProceeds} ETH (min: ${minReceived})`
        );

        // Encode the sell transaction
        const sellData = encodeFunctionData({
          abi: ERC20Z_ABI,
          functionName: "sell",
          args: [params.amount, params.recipient],
        });

        // Execute via Sub Account
        const callsId = await executeFromSubAccount([
          {
            to: params.coinAddress,
            data: sellData,
            value: "0",
          },
        ]);

        return {
          success: true,
          txHash: callsId,
          amountOut: ethProceeds,
          priceImpact:
            Number(
              ((ethProceeds - minReceived) * BigInt(10000)) / ethProceeds
            ) / 100,
        };
      } catch (error) {
        console.error("Sell transaction failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Sell failed",
        };
      }
    },
    [publicClient, executeFromSubAccount, subAccount]
  );

  /**
   * Get buy price for a specific amount of coins
   */
  const getBuyPrice = useCallback(
    async (coinAddress: Address, amount: bigint): Promise<bigint> => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const price = (await publicClient.readContract({
          address: coinAddress,
          abi: ERC20Z_ABI,
          functionName: "getEthPrice",
          args: [amount],
        })) as bigint;

        return price;
      } catch (error) {
        console.error("Failed to get buy price:", error);
        throw error;
      }
    },
    [publicClient]
  );

  /**
   * Get sell price for a specific amount of coins
   */
  const getSellPrice = useCallback(
    async (coinAddress: Address, amount: bigint): Promise<bigint> => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const proceeds = (await publicClient.readContract({
          address: coinAddress,
          abi: ERC20Z_ABI,
          functionName: "getSaleProceeds",
          args: [amount],
        })) as bigint;

        return proceeds;
      } catch (error) {
        console.error("Failed to get sell price:", error);
        throw error;
      }
    },
    [publicClient]
  );

  /**
   * Get user's coin balance
   */
  const getCoinBalance = useCallback(
    async (coinAddress: Address, userAddress: Address): Promise<bigint> => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const balance = (await publicClient.readContract({
          address: coinAddress,
          abi: ERC20Z_ABI,
          functionName: "balanceOf",
          args: [userAddress],
        })) as bigint;

        return balance;
      } catch (error) {
        console.error("Failed to get coin balance:", error);
        return BigInt(0);
      }
    },
    [publicClient]
  );

  return {
    buyCoin,
    sellCoin,
    getBuyPrice,
    getSellPrice,
    getCoinBalance,
  };
}
