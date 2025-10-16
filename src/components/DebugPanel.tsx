"use client";

import { useState, useEffect, useCallback } from "react";
import { useCreatorTipping } from "@/hooks/useCreatorTipping";
import type { SubAccount } from "@/hooks/useSubAccount";
import type { Address } from "viem";

interface DebugPanelProps {
  subAccount: SubAccount | null;
  universalAddress: Address | null;
  provider?: unknown;
  status?: string;
  isConnected?: boolean;
  isLoading?: boolean;
  isCreating?: boolean;
  fundSubAccount?: (amount?: string) => Promise<unknown>;
  getSubAccountBalance?: () => Promise<unknown>;
}

export function DebugPanel({
  subAccount,
  universalAddress,
  provider,
  status = "Not connected",
  isConnected = false,
  isLoading = false,
  isCreating = false,
  fundSubAccount,
  getSubAccountBalance,
}: DebugPanelProps) {
  const { getUSDCBalance } = useCreatorTipping();

  const [isExpanded, setIsExpanded] = useState(false);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [subAccountEthBalance, setSubAccountEthBalance] = useState<
    string | null
  >(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!subAccount || !universalAddress) return;

    setIsRefreshing(true);
    try {
      // Get ETH balance for universal address
      if (
        provider &&
        typeof provider === "object" &&
        provider !== null &&
        "request" in provider
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethBal = (await (provider as any).request({
          method: "eth_getBalance",
          params: [universalAddress, "latest"],
        })) as string;
        setEthBalance((parseInt(ethBal, 16) / 1e18).toFixed(4));
      }

      // Get Sub Account ETH balance
      if (getSubAccountBalance) {
        const subEthBal = await getSubAccountBalance();
        if (subEthBal && typeof subEthBal === "string") {
          const ethBalance = parseInt(subEthBal, 16) / 1e18;
          setSubAccountEthBalance(ethBalance.toFixed(4));
          // Use the same balance for tipping availability
          setUsdcBalance(ethBalance);
        }
      } else {
        // Fallback: Get ETH balance from tipping hook
        const usdcBal = await getUSDCBalance();
        setUsdcBalance(usdcBal);
      }
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    subAccount,
    universalAddress,
    provider,
    getSubAccountBalance,
    getUSDCBalance,
  ]);

  // Auto-refresh on mount and when accounts change
  useEffect(() => {
    if (subAccount && universalAddress) {
      refreshBalances();
    }
  }, [subAccount, universalAddress, refreshBalances]);

  const handleFundSubAccount = async () => {
    if (!fundSubAccount) {
      console.error("Fund Sub Account function not available");
      return;
    }

    setIsFunding(true);
    try {
      await fundSubAccount("0.001"); // Fund with 0.001 ETH
      await refreshBalances(); // Refresh after funding
    } catch (error) {
      console.error("Failed to fund sub account:", error);
    } finally {
      setIsFunding(false);
    }
  };

  if (!isConnected && !universalAddress) {
    return null; // Don't show debug panel when not connected
  }

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              🔧 Debug Panel
            </span>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{status}</span>
            <span
              className={`transform transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="pb-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Account Information */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Base Account (EOA)
                    </label>
                    <div className="font-mono text-sm text-gray-900 break-all">
                      {universalAddress || "Not connected"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      ETH Balance:{" "}
                      {ethBalance ? `${ethBalance} ETH` : "Loading..."}
                    </div>
                    <div className="text-xs text-gray-600">
                      Available for Tipping:{" "}
                      {usdcBalance
                        ? `${usdcBalance.toFixed(4)} ETH`
                        : "Loading..."}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Sub Account (Smart Wallet)
                    </label>
                    <div className="font-mono text-sm text-gray-900 break-all">
                      {subAccount?.address || "Not created"}
                    </div>
                    {subAccount && (
                      <>
                        <div className="text-xs text-gray-600 mt-1">
                          ETH Balance:{" "}
                          {subAccountEthBalance
                            ? `${subAccountEthBalance} ETH`
                            : "Loading..."}
                        </div>
                        <div className="text-xs text-gray-600">
                          Available for Tipping:{" "}
                          {usdcBalance !== null
                            ? `${usdcBalance.toFixed(4)} ETH`
                            : "Loading..."}
                        </div>
                      </>
                    )}
                  </div>

                  {subAccount?.factory && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Factory Address
                      </label>
                      <div className="font-mono text-sm text-gray-900 break-all">
                        {subAccount.factory}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Status & Actions
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Current Status
                    </label>
                    <div
                      className={`text-sm font-medium ${
                        isLoading || isCreating
                          ? "text-yellow-600"
                          : isConnected && subAccount
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {status}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={refreshBalances}
                      disabled={isRefreshing}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isRefreshing ? "Refreshing..." : "Refresh Balances"}
                    </button>

                    {subAccount && (
                      <>
                        <button
                          onClick={handleFundSubAccount}
                          disabled={isFunding}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {isFunding ? "Funding..." : "Fund Sub Account"}
                        </button>

                        <button
                          onClick={refreshBalances}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
                        >
                          Refresh Tip Balance
                        </button>
                      </>
                    )}
                  </div>

                  {/* Address Comparison */}
                  {universalAddress && subAccount && (
                    <div className="pt-2 border-t">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Address Comparison
                      </label>
                      <div className="text-xs text-gray-600 mt-1">
                        {universalAddress.toLowerCase() ===
                        subAccount.address.toLowerCase() ? (
                          <span className="text-red-600 font-medium">
                            ⚠️ Addresses are the same (Issue detected!)
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            ✅ Addresses are different (Correct setup)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Network Information & Setup Instructions */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-800 mb-2">
                🌐 Network: Base Sepolia Testnet
              </div>

              {/* Funding Instructions */}
              <div className="space-y-2">
                <div className="text-xs text-blue-700">
                  <strong>Step 1:</strong> Get testnet ETH for your Base Account
                  from{" "}
                  <a
                    href="https://faucet.quicknode.com/base/sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline font-medium"
                  >
                    Base Sepolia Faucet
                  </a>
                </div>

                <div className="text-xs text-blue-700">
                  <strong>Step 2:</strong> Click &quot;Fund Sub Account&quot;
                  button above to transfer ETH to your Sub Account
                </div>

                <div className="text-xs text-blue-700">
                  <strong>Step 3:</strong> Perfect! Your Sub Account has ETH
                  available. You can now tip creators instantly with zero wallet
                  pop-ups! ⚡
                </div>

                <div className="text-xs text-blue-700">
                  <strong>How it works:</strong> Tips send ETH directly from
                  your Sub Account to creators. No confirmations needed -
                  it&apos;s like Web2! (~$1 = 0.001 ETH, ~$5 = 0.005 ETH)
                </div>
              </div>

              {/* Status indicators */}
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="flex items-center gap-4 text-xs">
                  <span
                    className={`flex items-center gap-1 ${
                      ethBalance && parseFloat(ethBalance) > 0
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {ethBalance && parseFloat(ethBalance) > 0 ? "✅" : "⏳"}{" "}
                    Base Account ETH
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      subAccountEthBalance &&
                      parseFloat(subAccountEthBalance) > 0
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {subAccountEthBalance &&
                    parseFloat(subAccountEthBalance) > 0
                      ? "✅"
                      : "⏳"}{" "}
                    Sub Account ETH
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      usdcBalance && usdcBalance > 0
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {usdcBalance && usdcBalance > 0 ? "✅" : "⏳"} Ready to Tip
                    (ETH)
                  </span>
                </div>

                {/* Explorer Links */}
                {(universalAddress || subAccount) && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="text-xs text-blue-800 mb-1 font-medium">
                      🔍 Check Transactions on Base Sepolia:
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {universalAddress && (
                        <a
                          href={`https://sepolia.basescan.org/address/${universalAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Base Account ↗
                        </a>
                      )}
                      {subAccount && (
                        <a
                          href={`https://sepolia.basescan.org/address/${subAccount.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Sub Account ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
