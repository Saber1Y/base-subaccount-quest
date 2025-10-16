"use client";

import { useState } from "react";
import type { SubAccount } from "@/hooks/useSubAccount";

interface SubAccountSetupProps {
  onComplete: (subAccount: SubAccount) => void;
  isCreating: boolean;
  onCreateSubAccount: (fundingAmount: string) => Promise<SubAccount>;
}

export function SubAccountSetup({
  onComplete,
  isCreating,
  onCreateSubAccount,
}: SubAccountSetupProps) {
  const [step, setStep] = useState(1);
  const [fundingAmount, setFundingAmount] = useState("0.1");
  const [spendingLimit, setSpendingLimit] = useState("0.05");

  const handleCreateSubAccount = async () => {
    try {
      const subAccount = await onCreateSubAccount(fundingAmount);
      onComplete(subAccount);
    } catch (error) {
      console.error("Failed to create sub account:", error);
    }
  };

  const steps = [
    {
      title: "What is a Sub Account?",
      description:
        "Sub Accounts enable gasless transactions with pre-approved spending limits. Perfect for seamless NFT minting!",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">✨ Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Zero wallet pop-ups after setup</li>
              <li>• Instant NFT minting</li>
              <li>• Controlled spending limits</li>
              <li>• Enhanced security</li>
            </ul>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Got it! Let&apos;s set up →
          </button>
        </div>
      ),
    },
    {
      title: "Fund Your Sub Account",
      description:
        "Add ETH to your Sub Account for minting NFTs. You can top up anytime.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Amount (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 0.1 ETH (covers ~20 NFT mints)
            </p>
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Next: Spending Limits →
          </button>
        </div>
      ),
    },
    {
      title: "Set Spending Limits",
      description:
        "Control how much your Sub Account can spend per day for security.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Spending Limit (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.05"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 0.05 ETH per day (~10 NFT mints)
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">
              🎯 Setup Summary
            </h4>
            <div className="text-sm text-green-800 space-y-1">
              <div>Initial funding: {fundingAmount} ETH</div>
              <div>Daily limit: {spendingLimit} ETH</div>
              <div>
                Estimated mints: ~
                {Math.floor(parseFloat(fundingAmount) / 0.005)} NFTs
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateSubAccount}
            disabled={isCreating}
            className={`
              w-full py-3 rounded-lg font-medium transition-all duration-200
              ${
                isCreating
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }
            `}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Sub Account...
              </div>
            ) : (
              "🚀 Create Sub Account"
            )}
          </button>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              Step {step} of {steps.length}
            </span>
            <span>{Math.round((step / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {currentStep.title}
          </h2>
          <p className="text-gray-600 text-sm">{currentStep.description}</p>
        </div>

        {currentStep.content}

        {/* Back Button */}
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
