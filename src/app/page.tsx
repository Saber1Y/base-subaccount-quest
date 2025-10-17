"use client";

import { useState, useEffect } from "react";

import { useSubAccount } from "@/hooks/useSubAccount";
import { useSpendPermissions } from "@/hooks/useSpendPermissions";
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
    sdk,
    getSubAccountBalance,
  } = useSubAccount();

  // Spend permissions for seamless tipping
  const {
    permissionStatus,
    requestSpendPermissionFlow,
    executeSpendTip,
    canTipAmount,
  } = useSpendPermissions(
    sdk,
    universalAddress || undefined, // User's main address
    universalAddress || undefined // Main address as spender for spend permissions
  );

  const [showSubAccountSetup, setShowSubAccountSetup] = useState(false);

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
              "💡 Connect your Base wallet to enable spend permissions for seamless tipping!"
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
    if (!universalAddress) {
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
          ` Processing instant tip: ${tipAmount} ETH to ${coin.name}...`
        );

        // Execute instant tip using spend permission
        const result = await executeSpendTip(
          coin.creatorAddress as `0x${string}`,
          tipAmount
        );

        if (result.success) {
          showNotification(
            "success",
            ` Instant tip successful! ${tipAmount} ETH to ${coin.name} - No wallet pop-ups!`
          );
          console.log("Instant tip transaction hash:", result.txHash);
        } else {
          throw new Error(result.error || "Instant tip failed");
        }
        return;
      }

      // No spend permission - request it first
      showNotification(
        "info",
        ` Setting up zero-popup tipping (one-time setup)...`
      );

      const permissionResult = await requestSpendPermissionFlow(0.1, 30);

      if (permissionResult.success) {
        showNotification(
          "success",
          ` Zero-popup mode enabled! Processing your tip...`
        );

        // Retry logic for permission activation timing
        const executeWithRetry = async (
          maxRetries = 3
        ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              showNotification(
                "info",
                ` Executing tip (attempt ${attempt}/${maxRetries})...`
              );

              const result = await executeSpendTip(
                coin.creatorAddress as `0x${string}`,
                tipAmount,
                permissionResult.permission
              );

              if (result.success) {
                return result;
              } else if (
                result.error?.includes("Permission activating in") ||
                result.error?.includes("not yet active")
              ) {
                if (attempt < maxRetries) {
                  // Try to extract specific wait time from error message
                  let waitTime = 5000; // Default 5 seconds

                  if (result.error?.includes("Permission activating in")) {
                    const match = result.error.match(/(\d+)\s+seconds/);
                    if (match) {
                      const extractedWaitTime = parseInt(match[1]) * 1000;
                      if (
                        extractedWaitTime > 0 &&
                        extractedWaitTime <= 120000
                      ) {
                        waitTime = extractedWaitTime + 2000; // Add 2 second buffer
                      }
                    }
                  }

                  showNotification(
                    "info",
                    `⏳ Permission not ready yet. Waiting ${Math.ceil(
                      waitTime / 1000
                    )} seconds... (${attempt}/${maxRetries})`
                  );
                  console.log(
                    `Permission not ready yet. Retrying in ${
                      waitTime / 1000
                    } seconds... (${attempt}/${maxRetries})`
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  continue;
                } else {
                  throw new Error(result.error);
                }
              } else {
                throw new Error(result.error || "Tip execution failed");
              }
            } catch (error) {
              if (attempt === maxRetries) {
                throw error;
              }
              console.log(`Attempt ${attempt} failed, retrying...`, error);
            }
          }

          // If we reach here, all retries failed
          return { success: false, error: "All retry attempts failed" };
        };

        const result = await executeWithRetry();

        if (result.success) {
          showNotification(
            "success",
            `🎉 First tip complete! ${tipAmount} ETH to ${coin.name}. Future tips will be instant!`
          );
          console.log("First tip transaction hash:", result.txHash);
        } else {
          throw new Error(
            result.error || "Tip failed after permission granted"
          );
        }
        return;
      } else {
        showNotification(
          "error",
          `❌ Spend permission required for tipping. Please try again and grant permission.`
        );
        return;
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
              <strong>zero wallet pop-ups</strong> via Base Spend Permissions
            </p>

            {/* Value Proposition */}
            <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  Traditional Tipping
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
                  CreatorCoins Tipping
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
              <button
                onClick={handleSignInWithBase}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Connect Base Wallet
              </button>
              <p className="text-sm text-gray-500">
                Powered by Base Spend Permissions • Secure & Gasless
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
              Set up your Base wallet to enable instant, pop-up-free ETH
              tipping. This one-time setup takes less than 2 minutes.
            </p>
            <button
              onClick={() => setShowSubAccountSetup(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Connect Base Wallet
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
                  Wallet Balance (Testnet)
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
                <div className="text-xs text-blue-600 font-medium">Wallet</div>
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
                  {notification.type === "success" ? "" : ""}
                  {notification.type === "error" ? "" : ""}
                  {notification.type === "info" ? "" : ""}
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
                <div className="text-2xl font-bold text-green-600"></div>
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
                <div className="text-sm text-gray-600">Zero-Popup Tipping</div>
                <div className="text-xs text-gray-500 mt-1">
                  Enabled automatically on first tip
                </div>
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
          <p>Powered by Base Spend Permissions + ETH</p>
          <p className="mt-2">Support creators instantly with zero friction</p>
        </div>
      </main>
    </div>
  );
}
