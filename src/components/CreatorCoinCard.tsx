"use client";

import { formatUnits } from "viem";
import type { CreatorCoin } from "@/hooks/useCreatorCoins";

interface CreatorCoinCardProps {
  coin: CreatorCoin;
  onBuy?: (coin: CreatorCoin) => void;
  onSell?: (coin: CreatorCoin) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function CreatorCoinCard({
  coin,
  onBuy,
  onSell,
  isLoading = false,
  disabled = false,
}: CreatorCoinCardProps) {
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value?: string) => {
    if (!value) return null;
    const num = parseFloat(value);
    const isPositive = num >= 0;
    return (
      <span
        className={`text-sm font-semibold ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {isPositive ? "+" : ""}
        {num.toFixed(2)}%
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
      {/* Header with coin info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {/* Coin Avatar/Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {coin.symbol.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{coin.name}</h3>
                <p className="text-sm text-gray-500">{coin.symbol}</p>
              </div>
            </div>

            {coin.description && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {coin.description}
              </p>
            )}
          </div>
        </div>

        {/* Creator info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Creator: {coin.creatorAddress.slice(0, 6)}...
            {coin.creatorAddress.slice(-4)}
          </span>
          <span>{formatDate(coin.createdAt)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500">Market Cap</div>
            <div className="font-bold text-gray-900">
              {formatCurrency(coin.marketCap)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">24h Volume</div>
            <div className="font-bold text-gray-900">
              {formatCurrency(coin.volume24h)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">24h Change</div>
            <div>
              {formatPercentage(coin.marketCapDelta24h) || (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Holders</div>
            <div className="font-semibold text-gray-900">
              {coin.uniqueHolders.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Supply</div>
            <div className="font-semibold text-gray-900">
              {parseFloat(
                formatUnits(BigInt(coin.totalSupply || "0"), 18)
              ).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4">
        <div className="flex gap-2">
          <button
            onClick={() => onBuy?.(coin)}
            disabled={disabled || isLoading}
            className={`
              flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200
              ${
                disabled || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl"
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Buying...
              </div>
            ) : (
              "🚀 Buy"
            )}
          </button>

          <button
            onClick={() => onSell?.(coin)}
            disabled={disabled || isLoading}
            className={`
              flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200
              ${
                disabled || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl"
              }
            `}
          >
            📉 Sell
          </button>
        </div>

        {/* View on Zora link */}
        <a
          href={`https://zora.co/collect/base:${coin.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-center text-sm text-blue-600 hover:underline"
        >
          View on Zora ↗
        </a>
      </div>
    </div>
  );
}
