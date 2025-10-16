"use client";

import { useState, useEffect } from "react";
import { SignInWithBaseButton } from "@base-org/account-ui/react";

import { useSubAccount } from "@/hooks/useSubAccount";
import { useCreatorTipping } from "@/hooks/useCreatorTipping";
import { useSpendPermissions } from "@/hooks/useSpendPermissions";
import { SubAccountSetup } from "@/components/SubAccountSetup";
import { CreatorCoinsFeed } from "@/components/CreatorCoinsFeed";
import { DebugPanel } from "@/components/DebugPanel";
import { SpendPermissionSetup } from "@/components/SpendPermissionSetup";
import type { CreatorCoin } from "@/hooks/useCreatorCoins";

export default function Home() {
  const {
    subAccount,
    universalAddress,
    isCreating,
    isLoading,
    status,
    connectBaseAccount,
    createSubAccount,
    provider,
    isConnected,
    fundSubAccount,
    getSubAccountBalance,
    executeFromSubAccount,
  } = useSubAccount();

  const { tipCreator } = useCreatorTipping(subAccount, executeFromSubAccount);

  // Spend permissions for seamless tipping
  const {
    permissionStatus,
    requestSpendPermissionFlow,
    canTipAmount,
    deductFromAllowance,
  } = useSpendPermissions(
    provider,
    universalAddress || undefined, // User's main address
    subAccount?.address // Sub account as spender
  );

  const [showSubAccountSetup, setShowSubAccountSetup] = useState(false);
  const [showSpendPermissionSetup, setShowSpendPermissionSetup] =
    useState(false);
  const [tradingCoin, setTradingCoin] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "success" | "error" | "info";
      message: string;
    }>
  >([]);

  // Fetch ETH balance when sub account is available
  useEffect(() => {
    const fetchBalance = async () => {
      if (!subAccount) return;

      try {
        // Use the working balance source (getSubAccountBalance) instead of getUSDCBalance
        const balanceHex = await getSubAccountBalance();
        if (balanceHex && typeof balanceHex === "string") {
          const balance = Number(BigInt(balanceHex)) / 1e18;
          setUsdcBalance(balance);

          // Show helpful notification if balance is low
          if (balance === 0) {
            showNotification(
              "info",
              "💡 Fund your Sub Account with ETH to start tipping creators! Check the debug panel for instructions."
            );
          }
        } else {
          setUsdcBalance(0);
        }
      } catch (error) {
        console.error("Failed to fetch ETH balance:", error);
        setUsdcBalance(0);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [subAccount, getSubAccountBalance]);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const handleSignInWithBase = async () => {
    try {
      await connectBaseAccount();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleTipCreator = async (coin: CreatorCoin, tipAmount: number) => {
    if (!subAccount || !universalAddress) {
      showNotification("error", "Please connect your Base Account first");
      return;
    }

    setTradingCoin(coin.id);
    try {
      console.log(`Tipping creator ${coin.name} with ${tipAmount} ETH`);

      // Check if we have spend permission and amount is within allowance
      if (permissionStatus.hasPermission && canTipAmount(tipAmount)) {
        showNotification(
          "info",
          `🚀 Instant tip: ${tipAmount} ETH to ${coin.name} via spend permission...`
        );

        // Execute instant tip via Sub Account (no wallet popup)
        const result = await tipCreator(
          coin.creatorAddress as `0x${string}`,
          tipAmount
        );

        if (result.success) {
          // Deduct from allowance
          deductFromAllowance(tipAmount);

          showNotification(
            "success",
            `🎉 Instant tip successful! ${result.amount} to ${coin.name} - No wallet pop-ups!`
          );

          // Refresh balance
          try {
            const balanceHex = await getSubAccountBalance();
            if (balanceHex && typeof balanceHex === "string") {
              const newBalance = Number(BigInt(balanceHex)) / 1e18;
              setUsdcBalance(newBalance);
            }
          } catch (error) {
            console.error("Failed to refresh balance:", error);
          }
        } else {
          throw new Error(result.error || "Instant tip failed");
        }
        return;
      }

      // Fall back to regular Sub Account tipping (this will require wallet confirmation first time)
      showNotification(
        "info",
        `Tipping ${coin.name} creator ${tipAmount} ETH via Sub Account...`
      );

      // Check balance first using the working balance source
      const balanceHex = await getSubAccountBalance();
      const balance =
        balanceHex && typeof balanceHex === "string"
          ? Number(BigInt(balanceHex)) / 1e18
          : 0;

      // tipAmount is now direct ETH amount
      if (balance < tipAmount) {
        showNotification(
          "error",
          `Insufficient ETH balance. You have ${balance.toFixed(
            4
          )} ETH, need ${tipAmount.toFixed(4)} ETH`
        );
        return;
      }

      // Execute the tip via Sub Account
      const result = await tipCreator(
        coin.creatorAddress as `0x${string}`,
        tipAmount
      );

      if (result.success) {
        showNotification(
          "success",
          `🎉 Successfully tipped ${result.amount} to ${coin.name} creator!`
        );
        console.log("Tip transaction hash:", result.txHash);

        // Refresh balance after successful tip
        try {
          const balanceHex = await getSubAccountBalance();
          if (balanceHex && typeof balanceHex === "string") {
            const newBalance = Number(BigInt(balanceHex)) / 1e18;
            setUsdcBalance(newBalance);
          }
        } catch (error) {
          console.error("Failed to refresh balance:", error);
        }
      } else {
        throw new Error(result.error || "Tip failed");
      }
    } catch (error) {
      console.error("Tip failed:", error);
      showNotification(
        "error",
        `Tip failed: ${
          error instanceof Error ? error.message : "Please try again"
        }`
      );
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
              Tip creators instantly with ETH using{" "}
              <strong>zero wallet pop-ups</strong> via Base Sub Accounts
            </p>

            {/* Value Proposition */}
            <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  ❌ Traditional Tipping
                </h3>
                <ul className="text-red-800 text-sm space-y-2">
                  <li>• Multiple wallet confirmations</li>
                  <li>• High gas fees</li>
                  <li>• Complicated UX flow</li>
                  <li>• Long confirmation times</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✅ CreatorCoins Tipping
                </h3>
                <ul className="text-green-800 text-sm space-y-2">
                  <li>• Zero wallet pop-ups</li>
                  <li>• Instant ETH transfers</li>
                  <li>• Simple one-click tipping</li>
                  <li>• Web2-like experience</li>
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
      <div className="min-h-screen flex flex-col">
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
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
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
              Ready to start tipping creators? 🚀
            </h2>
            <p className="text-gray-600 mb-8">
              Set up your Sub Account to enable instant, pop-up-free ETH
              tipping. This one-time setup takes less than 2 minutes.
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

        {/* Debug Panel - ALWAYS SHOW when connected */}
        <DebugPanel
          subAccount={subAccount}
          universalAddress={universalAddress}
          provider={provider}
          status={status}
          isConnected={isConnected}
          isLoading={isLoading}
          isCreating={isCreating}
          fundSubAccount={fundSubAccount}
          getSubAccountBalance={getSubAccountBalance}
        />
      </div>
    );
  }

  // Authenticated with sub account - show main app
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-600">CreatorCoins</h1>

            {/* Sub Account Info */}
            <div className="flex items-center gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <div className="text-xs text-green-600 font-medium">
                  ⚡ Sub Account ETH (Testnet)
                </div>
                <div className="text-sm font-bold text-green-900">
                  {usdcBalance !== null ? (
                    `${usdcBalance.toFixed(4)} ETH`
                  ) : (
                    <div className="h-4 w-16 bg-green-200 rounded animate-pulse" />
                  )}
                </div>
              </div>

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

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                px-4 py-3 rounded-lg shadow-lg max-w-sm animate-slide-in
                ${
                  notification.type === "success"
                    ? "bg-green-600 text-white"
                    : ""
                }
                ${notification.type === "error" ? "bg-red-600 text-white" : ""}
                ${notification.type === "info" ? "bg-blue-600 text-white" : ""}
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {notification.type === "success" ? "✅" : ""}
                  {notification.type === "error" ? "❌" : ""}
                  {notification.type === "info" ? "ℹ️" : ""}
                </span>
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Wallet Pop-ups</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-green-600">Instant</div>
            <div className="text-sm text-gray-600">ETH Tips</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">Support</div>
            <div className="text-sm text-gray-600">Creators</div>
          </div>
          {/* Spend Permission Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            {permissionStatus.hasPermission ? (
              <div>
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-sm text-gray-600">Zero-Popup Mode</div>
                <div className="text-xs text-gray-500 mt-1">
                  {permissionStatus.allowance
                    ? `${(Number(permissionStatus.allowance) / 1e18).toFixed(
                        3
                      )} ETH left`
                    : "Active"}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-orange-600">⚡</div>
                <div className="text-sm text-gray-600">Enable Zero-Popup</div>
                <button
                  onClick={() => setShowSpendPermissionSetup(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-1 underline"
                >
                  Setup Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Creator Tipping */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Creator Coins on Base
            </h2>
            <div className="text-sm text-gray-600">
              Tip creators with testnet ETH instantly - no wallet pop-ups! ⚡
            </div>
          </div>

          <CreatorCoinsFeed
            onTip={handleTipCreator}
            loadingCoinId={tradingCoin}
          />
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Powered by Base Sub Accounts + ETH</p>
          <p className="mt-2">
            Support creators instantly with zero friction 💜
          </p>
        </div>
      </main>

      {/* Debug Panel - ALWAYS at bottom */}
      <DebugPanel
        subAccount={subAccount}
        universalAddress={universalAddress}
        provider={provider}
        status={status}
        isConnected={isConnected}
        isLoading={isLoading}
        isCreating={isCreating}
        fundSubAccount={fundSubAccount}
        getSubAccountBalance={getSubAccountBalance}
      />

      {/* Spend Permission Setup Modal */}
      {showSpendPermissionSetup &&
        universalAddress &&
        subAccount &&
        provider && (
          <SpendPermissionSetup
            isOpen={showSpendPermissionSetup}
            onClose={() => setShowSpendPermissionSetup(false)}
            provider={
              provider as {
                request: (args: {
                  method: string;
                  params: unknown[];
                }) => Promise<unknown>;
              }
            }
            userAddress={universalAddress}
            spenderAddress={subAccount.address}
            onPermissionGranted={(permission) => {
              console.log("Spend permission granted:", permission);
              showNotification(
                "success",
                "🎉 Spend permission granted! You can now tip instantly without wallet pop-ups!"
              );
            }}
          />
        )}
    </div>
  );
}
