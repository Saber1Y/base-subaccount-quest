"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCoinsNew,
  getCoinsTopGainers,
  getCoinsTopVolume24h,
} from "@zoralabs/coins-sdk";

export interface CreatorCoin {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  address: string;
  creatorAddress: string;
  marketCap: string;
  volume24h: string;
  marketCapDelta24h?: string;
  totalSupply: string;
  uniqueHolders: number;
  createdAt: string;
  chainId: number;
}

type FeedType = "new" | "gainers" | "volume";

export function useCreatorCoins(feedType: FeedType = "new") {
  const [coins, setCoins] = useState<CreatorCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const fetchCoins = useCallback(
    async (loadMore = false) => {
      try {
        if (!loadMore) {
          setIsLoading(true);
          setError(null);
        }

        let response;
        const options = {
          count: 20,
          after: loadMore ? cursor : undefined,
        };

        // Choose the appropriate SDK function based on feed type
        switch (feedType) {
          case "new":
            response = await getCoinsNew(options);
            break;
          case "gainers":
            response = await getCoinsTopGainers(options);
            break;
          case "volume":
            response = await getCoinsTopVolume24h(options);
            break;
          default:
            response = await getCoinsNew(options);
        }

        console.log(`Fetched ${feedType} coins:`, response);

        // Extract coins from the response
        const edges = response.data?.exploreList?.edges || [];
        const newCoins: CreatorCoin[] = edges.map(
          (edge: { node: Record<string, unknown> }) => ({
            id: edge.node.id || edge.node.address,
            name: edge.node.name || "Unnamed Coin",
            symbol: edge.node.symbol || "UNK",
            description: edge.node.description,
            address: edge.node.address,
            creatorAddress: edge.node.creatorAddress,
            marketCap: edge.node.marketCap || "0",
            volume24h: edge.node.volume24h || "0",
            marketCapDelta24h: edge.node.marketCapDelta24h,
            totalSupply: edge.node.totalSupply || "0",
            uniqueHolders: edge.node.uniqueHolders || 0,
            createdAt: edge.node.createdAt || new Date().toISOString(),
            chainId: edge.node.chainId || 8453, // Base mainnet
          })
        );

        if (loadMore) {
          setCoins((prev) => [...prev, ...newCoins]);
        } else {
          setCoins(newCoins);
        }

        // Update pagination info
        const pageInfo = response.data?.exploreList?.pageInfo;
        setCursor(pageInfo?.endCursor);
        setHasMore(pageInfo?.hasNextPage || false);
      } catch (err) {
        console.error(`Failed to fetch ${feedType} creator coins:`, err);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load ${feedType} coins`
        );
        if (!loadMore) {
          setCoins([]);
        }
      } finally {
        if (!loadMore) {
          setIsLoading(false);
        }
      }
    },
    [feedType, cursor]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchCoins(true);
    }
  }, [fetchCoins, hasMore, isLoading]);

  const refetch = useCallback(() => {
    setCursor(undefined);
    setHasMore(true);
    fetchCoins(false);
  }, [fetchCoins]);

  useEffect(() => {
    fetchCoins(false);
  }, [feedType, fetchCoins]); // Refetch when feed type changes

  return {
    coins,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
