// components/NFTCard.tsx
"use client";

import Image from "next/image";
import { formatEther } from "viem";
import type { ZoraNFT } from "@/hooks/useZoraNFTs";

interface NFTCardProps {
  nft: ZoraNFT;
  onMint: (nft: ZoraNFT) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function NFTCard({
  nft,
  onMint,
  isLoading = false,
  disabled = false,
}: NFTCardProps) {
  const mintPriceStr = nft.mintPrice ? formatEther(nft.mintPrice) : "—";
  const progress =
    nft.totalMinted && nft.maxSupply
      ? Number((nft.totalMinted * BigInt(100)) / nft.maxSupply)
      : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
      <div className="aspect-square relative overflow-hidden bg-gray-100">
        {nft.image ? (
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover"
            sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
        {nft.totalMinted && nft.maxSupply && (
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            {Number(nft.totalMinted)}/{Number(nft.maxSupply)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
          {nft.name}
        </h3>
        {nft.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {nft.description}
          </p>
        )}
        {nft.totalMinted && nft.maxSupply && progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Minted</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="text-lg font-bold text-gray-900">
              {mintPriceStr} ETH
            </div>
          </div>
          <button
            onClick={() => onMint(nft)}
            disabled={disabled || isLoading}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              disabled || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg hover:shadow-xl"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Minting...
              </div>
            ) : (
              "Mint Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
