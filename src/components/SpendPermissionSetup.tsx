"use client";

import { useState } from "react";
import { useSpendPermissions } from "@/hooks/useSpendPermissions";
import type { Address } from "viem";

interface SpendPermissionSetupProps {
  userBaseAccount: Address;
  appSpenderAddress: Address;
  provider: any;
  onPermissionGranted: () => void;
  onCancel?: () => void;
}

export function SpendPermissionSetup({
  userBaseAccount,
  appSpenderAddress,
  provider,
  onPermissionGranted,
  onCancel,
}: SpendPermissionSetupProps) {
  const [allowanceEth, setAllowanceEth] = useState("0.1"); // Default 0.1 ETH
  const [periodDays, setPeriodDays] = useState("30"); // Default 30 days

  const { requestNewSpendPermission, isRequestingPermission } = useSpendPermissions(
    provider,
    userBaseAccount,
    appSpenderAddress
  );

  const handleRequestPermission = async () => {
    try {
      await requestNewSpendPermission(
        parseFloat(allowanceEth),
        parseInt(periodDays)
      );
      onPermissionGranted();
    } catch (error) {
      console.error("Failed to request spend permission:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enable Zero-Friction Tipping
          </h2>
          <p className="text-gray-600">
            Grant spending permission to tip creators instantly without wallet pop-ups!
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowance (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={allowanceEth}
              onChange={(e) => setAllowanceEth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum ETH you allow for tipping within each period
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period (Days)
            </label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How often the allowance resets
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-xs">
                <li>• You sign once to grant permission</li>
                <li>• All future tips happen instantly</li>
                <li>• No wallet pop-ups for each tip</li>
                <li>• You can revoke anytime</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onCancel?.() || window.history.back()}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRequestPermission}
            disabled={isRequestingPermission || !allowanceEth || !periodDays}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequestingPermission ? "Requesting..." : "Grant Permission"}
          </button>
        </div>
      </div>
    </div>
  );
}
