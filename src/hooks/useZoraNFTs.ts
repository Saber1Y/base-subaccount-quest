// hooks/useZoraNFTs.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Address } from "viem";
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { usePublicClient } from "wagmi";

export interface ZoraNFT {
  contractAddress: Address;
  tokenId: bigint;
  name: string;
  description?: string;
  image?: string;
  mintPrice: bigint;
  maxSupply?: bigint;
  totalMinted?: bigint;
  creatorAddress: Address;
  mintType: "1155" | "721";
}

// Add a type for collection info discovered from GraphQL
interface GraphQLCollection {
  contract: string;
  tokenIds: bigint[];
  mintType: "1155" | "721";
}

export function useZoraNFTs(chainId: number = 8453) {
  const [nfts, setNfts] = useState<ZoraNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId });
  const collectorClient = useMemo(() => {
    if (!publicClient) return null;
    try {
      return createCollectorClient({
        chainId,
        publicClient: publicClient as Parameters<
          typeof createCollectorClient
        >[0]["publicClient"],
      });
    } catch (err) {
      console.warn("Failed to create collector client:", err);
      return null;
    }
  }, [chainId, publicClient]);

  // Helper: fetch collections via GraphQL
  const fetchCollections = async (): Promise<GraphQLCollection[]> => {
    const query = {
      query: `
        query RecentBaseTokens {
          tokens(
            where: {
              tokenStandards: [ERC1155, ERC721]
            }
            networks: [{
              network: BASE
              chain: BASE_MAINNET
            }]
            pagination: {
              limit: 20
            }
            sort: {
              sortKey: CREATED
              sortDirection: DESC
            }
          ) {
            nodes {
              token {
                collectionAddress
                tokenId
                tokenStandard
                mintInfo {
                  mintable
                  price {
                    nativePrice {
                      decimal
                    }
                  }
                }
              }
            }
          }
        }
      `,
    };
    const res = await fetch("/api/zora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    const json = await res.json();
    
    if (json.errors) {
      throw new Error(`GraphQL Error: ${json.errors[0].message}`);
    }
    
    // Parse the new response structure
    const tokens = json?.data?.tokens?.nodes ?? [];
    const collectionsMap = new Map<string, GraphQLCollection>();
    
    tokens.forEach((node: { token: { collectionAddress: string; tokenId: string; tokenStandard: string; mintInfo: { mintable: boolean } } }) => {
      const { collectionAddress, tokenId, tokenStandard, mintInfo } = node.token;
      
      if (!mintInfo.mintable) return; // Skip non-mintable tokens
      
      const mintType = tokenStandard === "ERC1155" ? "1155" : "721";
      
      if (!collectionsMap.has(collectionAddress)) {
        collectionsMap.set(collectionAddress, {
          contract: collectionAddress,
          tokenIds: [],
          mintType: mintType as "1155" | "721",
        });
      }
      
      const collection = collectionsMap.get(collectionAddress)!;
      collection.tokenIds.push(BigInt(tokenId));
    });
    
    return Array.from(collectionsMap.values());
  };

  const fetchZoraNFTs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const collections = await fetchCollections();
      if (!collections || collections.length === 0) {
        throw new Error(
          "No Zora collections found on Base Mainnet via GraphQL"
        );
      }

      const fetchedNFTs: ZoraNFT[] = [];

      for (const col of collections) {
        for (const tokenId of col.tokenIds) {
          if (!collectorClient) {
            throw new Error("Collector client not initialized");
          }
          try {
            const token = await collectorClient.getToken({
              tokenContract: col.contract as Address,
              tokenId,
              mintType: col.mintType,
            });
            // token may contain metadata, supply, minted, etc. either at top-level or nested under `.token`
            const anyToken = token as any;
            const metadata = anyToken.metadata ?? anyToken.token?.metadata;
            const mintSettings = anyToken.mintSettings ?? anyToken.token?.mintSettings;
            const supply = anyToken.supply ?? anyToken.token?.supply;
            const creator = anyToken.creator ?? anyToken.token?.creator;

            fetchedNFTs.push({
              contractAddress: col.contract as Address,
              tokenId,
              name: metadata?.name ?? `Token #${tokenId}`,
              description: metadata?.description,
              image: metadata?.image ?? undefined,
              mintPrice: mintSettings?.mintPrice ?? 0n,
              maxSupply: supply?.max ?? undefined,
              totalMinted: supply?.minted ?? undefined,
              creatorAddress: creator ?? (col.contract as Address),
              mintType: col.mintType,
            });
          } catch (tokenError) {
            console.warn(
              `Error fetching token ${tokenId} from ${col.contract}`,
              tokenError
            );
            // ignore and continue
          }
        }
      }

      if (fetchedNFTs.length === 0) {
        throw new Error("No mintable NFTs found in discovered collections");
      }

      setNfts(fetchedNFTs);
    } catch (err) {
      console.error("Failed to fetch Zora NFTs:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  }, [collectorClient]);

  useEffect(() => {
    if (collectorClient) {
      fetchZoraNFTs();
    }
  }, [collectorClient, fetchZoraNFTs]);

  const prepareMintTransaction = async (
    nft: ZoraNFT,
    mintRecipient: Address,
    minterAccount: Address,
    quantityToMint: number = 1
  ) => {
    if (!collectorClient) {
      throw new Error("Collector client not initialized");
    }
    try {
      const { parameters } = await collectorClient.mint({
        mintType: nft.mintType,
        tokenContract: nft.contractAddress,
        tokenId: nft.tokenId,
        mintRecipient,
        quantityToMint,
        minterAccount,
        mintComment: "Minted via InstaZora with Sub Account",
      });
      return {
        to: parameters.address as Address,
        data: parameters.data as `0x${string}`,
        value: parameters.value || 0n,
      };
    } catch (err) {
      console.error("Failed to prepare mint transaction:", err);
      throw new Error("Failed to prepare mint. Check details or chain config.");
    }
  };

  return {
    nfts,
    isLoading,
    error,
    refetch: fetchZoraNFTs,
    prepareMintTransaction,
  };
}
