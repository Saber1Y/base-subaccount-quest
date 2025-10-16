"use client";

import { useState } from "react";
import { Address } from "viem";
import {
  useSpendPermissions,
  SpendPermission,
} from "@/hooks/useSpendPermissions";

interface Provider {
  request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
}

interface SpendPermissionSetupProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  userAddress: Address;
  spenderAddress: Address;
  onPermissionGranted: (permission: SpendPermission) => void;
}

export function SpendPermissionSetup({
  isOpen,
  onClose,
  provider,
  userAddress,
  spenderAddress,
  onPermissionGranted,
}: SpendPermissionSetupProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0.1);
  const [periodDays, setPeriodDays] = useState(30);

  const { requestSpendPermissionFlow } = useSpendPermissions(
    provider,
    userAddress,
    spenderAddress
  );

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestSpendPermissionFlow(
        allowanceAmount,
        periodDays
      );

      if (result.success && result.permission) {
        onPermissionGranted(result.permission);
        onClose();
      } else {
        alert(`Permission request failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Permission request error:", error);
      alert("Permission request failed. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enable Zero-Popup Tipping
          </h2>
          <p className="text-gray-600">
            Grant permission for seamless ETH tipping without wallet pop-ups
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ETH Allowance
            </label>
            <div className="relative">
              <input
                type="number"
                value={allowanceAmount}
                onChange={(e) => setAllowanceAmount(Number(e.target.value))}
                step="0.01"
                min="0.01"
                max="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0.1"
              />
              <span className="absolute right-3 top-3 text-gray-500 text-sm">
                ETH
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum amount you can tip without additional confirmations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Duration
            </label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                How it works
              </h3>
              <ul className="text-xs text-blue-800 mt-1 space-y-1">
                <li>• One-time wallet approval for the specified amount</li>
                <li>• Future tips happen instantly without pop-ups</li>
                <li>• You can revoke permission anytime</li>
                <li>• Secure and controlled by Base wallet</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isRequesting}
          >
            Cancel
          </button>
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? "Requesting..." : "Grant Permission"}
          </button>
        </div>
      </div>
    </div>
  );
}
