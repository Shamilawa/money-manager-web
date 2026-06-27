"use client";
import React, { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useFinance } from "../context/FinanceContext";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { accounts, setPrimaryAccount } = useFinance();
  const [selectedId, setSelectedId] = useState<string>(
    accounts.find(a => a.isPrimary)?.id || ""
  );

  const handleSave = async () => {
    if (selectedId) {
      await setPrimaryAccount(selectedId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Primary Account for AI Assistant
          </label>
          <p className="text-xs text-gray-500 mb-4">
            Select the default account the AI will use to log expenses when you don't explicitly specify one.
          </p>
          <select 
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="" disabled>Select an account...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} - ${acc.balance.toFixed(2)}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
