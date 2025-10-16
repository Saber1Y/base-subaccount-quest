"use client";

import { useState } from "react";
import { useCreatorCoins, type CreatorCoin } from "@/hooks/useCreatorCoins";
import { CreatorCoinCard } from "./CreatorCoinCard";

type FeedType = "new" | "gainers" | "volume";

interface CreatorCoinsFeedProps {
  onBuyCoin?: (coin: CreatorCoin) => void;
  onSellCoin?: (coin: CreatorCoin) => void;
}

export function CreatorCoinsFeed({
  onBuyCoin,
  onSellCoin,
}: CreatorCoinsFeedProps) {
  const [feedType, setFeedType] = useState<FeedType>("new");
  const [loadingCoin, setLoadingCoin] = useState<string | null>(null);

  const { coins, isLoading, error, hasMore, loadMore, refetch } =
    useCreatorCoins(feedType);

  const handleBuyCoin = async (coin: CreatorCoin) => {
    setLoadingCoin(coin.id);
    try {
      await onBuyCoin?.(coin);
    } finally {
      setLoadingCoin(null);
    }
  };

  const handleSellCoin = async (coin: CreatorCoin) => {
    setLoadingCoin(coin.id);
    try {
      await onSellCoin?.(coin);
    } finally {
      setLoadingCoin(null);
    }
  };

  const feedTabs = [
    {
      key: "new" as FeedType,
      label: "🆕 New",
      description: "Recently created coins",
    },
    {
      key: "gainers" as FeedType,
      label: "📈 Top Gainers",
      description: "Biggest 24h market cap increases",
    },
    {
      key: "volume" as FeedType,
      label: "🔥 High Volume",
      description: "Most traded in 24h",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Feed Type Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {feedTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFeedType(tab.key)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  feedType === tab.key
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Current feed description */}
        <p className="text-gray-600 text-sm">
          {feedTabs.find((tab) => tab.key === feedType)?.description}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-red-800 font-medium">
              Error loading creator coins
            </span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && coins.length === 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coins Grid */}
      {!isLoading && coins.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {coins.map((coin) => (
              <CreatorCoinCard
                key={coin.id}
                coin={coin}
                onBuy={handleBuyCoin}
                onSell={handleSellCoin}
                isLoading={loadingCoin === coin.id}
                disabled={loadingCoin !== null}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Loading..." : "Load More Coins"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && coins.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🪙</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Creator Coins Found
          </h3>
          <p className="text-gray-600 mb-4">
            No{" "}
            {feedTabs.find((tab) => tab.key === feedType)?.label.toLowerCase()}{" "}
            creator coins available right now.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Stats Footer */}
      {coins.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {coins.length} creator coins • Updated in real-time via Zora
          API
        </div>
      )}
    </div>
  );
}
