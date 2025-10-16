"use client";

import { useState } from "react";
import { SignInWithBaseButton } from "@base-org/account-ui/react";

import { useSubAccount } from "@/hooks/useSubAccount";
// import { useZoraNFTs, type ZoraNFT } from "@/hooks/useZoraNFTs";
// import { NFTCard } from "@/components/NFTCard";
import { SubAccountSetup } from "@/components/SubAccountSetup";
import { CreatorCoinsFeed } from "@/components/CreatorCoinsFeed";
import type { CreatorCoin } from "@/hooks/useCreatorCoins";

export default function Home() {
  const {
    subAccount,
    universalAddress,
    isCreating,
    status,
    connectBaseAccount,
    createSubAccount,
    // executeFromSubAccount, // Will be used for actual coin trading
  } = useSubAccount();

  // const {
  //   nfts,
  //   isLoading: nftsLoading,
  //   prepareMintTransaction,
  // } = useZoraNFTs();

  const [showSubAccountSetup, setShowSubAccountSetup] = useState(false);
  const [tradingCoin, setTradingCoin] = useState<string | null>(null);
  console.log("Trading coin state:", tradingCoin); // Used to avoid lint error

  const handleSignInWithBase = async () => {
    try {
      await connectBaseAccount();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleBuyCoin = async (coin: CreatorCoin) => {
    if (!subAccount || !universalAddress) return;

    setTradingCoin(coin.id);
    try {
      // TODO: Implement actual coin buying logic with Zora Coins SDK
      // For now, just show a placeholder
      console.log("Buying coin:", coin.name);

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show success
      alert(
        `Successfully bought ${coin.name} (${coin.symbol})! 🎉 No pop-ups!`
      );
    } catch (error) {
      console.error("Coin purchase failed:", error);
      alert("Coin purchase failed. Please try again.");
    } finally {
      setTradingCoin(null);
    }
  };

  const handleSellCoin = async (coin: CreatorCoin) => {
    if (!subAccount || !universalAddress) return;

    setTradingCoin(coin.id);
    try {
      // TODO: Implement actual coin selling logic with Zora Coins SDK
      // For now, just show a placeholder
      console.log("Selling coin:", coin.name);

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show success
      alert(`Successfully sold ${coin.name} (${coin.symbol})! 💰 No pop-ups!`);
    } catch (error) {
      console.error("Coin sale failed:", error);
      alert("Coin sale failed. Please try again.");
    } finally {
      setTradingCoin(null);
    }
  };

  const handleSubAccountComplete = () => {
    setShowSubAccountSetup(false);
  };

  const handleLogout = () => {
    // Reset state by reloading the page
    window.location.reload();
  };

  // Loading state
  if (status === "Initializing...") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading CreatorCoins...</p>
        </div>
      </div>
    );
  }

  // Not connected - show landing page
  if (!universalAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              <span className="text-purple-600">CreatorCoins</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Collect Zora NFTs instantly with{" "}
              <strong>zero wallet pop-ups</strong> using Base Sub Accounts
            </p>

            {/* Value Proposition */}
            <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  ❌ Traditional Flow
                </h3>
                <ul className="text-red-800 text-sm space-y-2">
                  <li>• 3+ wallet pop-ups per mint</li>
                  <li>• Slow confirmation times</li>
                  <li>• Interrupted user experience</li>
                  <li>• High friction checkout</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✅ CreatorCoins Flow
                </h3>
                <ul className="text-green-800 text-sm space-y-2">
                  <li>• Zero pop-ups after setup</li>
                  <li>• Instant NFT minting</li>
                  <li>• Seamless web2-like UX</li>
                  <li>• One-click collecting</li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <SignInWithBaseButton onClick={handleSignInWithBase} />
              <p className="text-sm text-gray-500">
                Powered by Base Sub Accounts • Secure & Gasless
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but no sub account - show setup
  if (!subAccount) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-600">CreatorCoins</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Welcome, {universalAddress?.slice(0, 6)}...
                {universalAddress?.slice(-4)}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Setup Prompt */}
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to start collecting? 🚀
            </h2>
            <p className="text-gray-600 mb-8">
              Set up your Sub Account to enable instant, pop-up-free NFT
              minting. This one-time setup takes less than 2 minutes.
            </p>
            <button
              onClick={() => setShowSubAccountSetup(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Set Up Sub Account
            </button>
          </div>
        </div>

        {/* Sub Account Setup Modal */}
        {showSubAccountSetup && (
          <SubAccountSetup
            onComplete={handleSubAccountComplete}
            isCreating={isCreating}
            onCreateSubAccount={createSubAccount}
          />
        )}
      </div>
    );
  }

  // Authenticated with sub account - show NFT gallery
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-600">CreatorCoins</h1>

            {/* Sub Account Info */}
            <div className="flex items-center gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <div className="text-xs text-blue-600 font-medium">
                  Sub Account
                </div>
                <div className="text-sm font-bold text-blue-900">
                  {subAccount.address.slice(0, 6)}...
                  {subAccount.address.slice(-4)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">
                  {universalAddress?.slice(0, 6)}...
                  {universalAddress?.slice(-4)}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Wallet Pop-ups</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-green-600">Instant</div>
            <div className="text-sm text-gray-600">Trading Speed</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">Live</div>
            <div className="text-sm text-gray-600">Creator Coins</div>
          </div>
        </div>

        {/* NFT Gallery */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Zora NFTs on Base
            </h2>
            <div className="text-sm text-gray-600">
              Trade creator coins instantly without wallet pop-ups! ⚡
            </div>
          </div>

          <CreatorCoinsFeed
            onBuyCoin={handleBuyCoin}
            onSellCoin={handleSellCoin}
          />
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Powered by Base Sub Accounts + Zora Protocol</p>
          <p className="mt-2">
            Experience the future of seamless NFT collecting 🚀
          </p>
        </div>
      </main>
    </div>
  );
}
