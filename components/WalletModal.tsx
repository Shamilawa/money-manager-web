"use client";
import React, { useState, useEffect } from "react";
import { useFinance } from "../context/FinanceContext";
import type { Account } from "../context/FinanceContext";
import { X, Check } from "@phosphor-icons/react";
import { preciseRound } from "../utils/math";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWallet?: Account | null;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, editingWallet }) => {
  const { addAccount, editAccount, deleteAccount } = useFinance();

  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("checking");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("#10b981");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (editingWallet) {
      setName(editingWallet.name);
      setType(editingWallet.type);
      setBalance(editingWallet.balance.toString());
      setColor(editingWallet.color);
    } else {
      setName("");
      setType("checking");
      setBalance("");
      setColor("#10b981");
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [editingWallet, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Wallet name is required";
    
    const parsedBalance = parseFloat(balance);
    if (isNaN(parsedBalance)) {
      newErrors.balance = "Enter a valid number for initial balance";
    }

    if (!color.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.color = "Select a valid color";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const accountData = {
      name: name.trim(),
      type,
      balance: type === "credit" && parsedBalance > 0 ? -preciseRound(parsedBalance) : preciseRound(parsedBalance),
      color
    };

    if (editingWallet) {
      editAccount({ ...accountData, id: editingWallet.id });
    } else {
      addAccount(accountData);
    }

    onClose();
  };

  const colors = ["#10b981", "#34d399", "#f43f5e", "#60a5fa", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b", "#06b6d4"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-bg-base/80 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Modal Box */}
      <div className="bg-bg-panel border border-border-subtle rounded-card w-full max-w-sm relative z-10 glass-border p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border-subtle shrink-0">
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            {editingWallet ? "Edit Wallet" : "Add New Wallet"}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition cursor-pointer btn-tactile"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Wallet Name
            </label>
            <input
              type="text"
              placeholder="e.g. Chase Checking"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              className={`w-full bg-bg-base border rounded-md px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 font-medium ${
                errors.name ? "border-rose-loss" : "border-border-subtle"
              }`}
            />
            {errors.name && (
              <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.name}</span>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Wallet Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as Account["type"])}
              className="w-full bg-bg-base border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white font-medium cursor-pointer"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
              <option value="investment">Investment</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Initial Balance (LKR)
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={balance}
              onChange={e => {
                setBalance(e.target.value);
                if (errors.balance) setErrors(prev => ({ ...prev, balance: "" }));
              }}
              className={`w-full bg-bg-base border rounded-md px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600 font-medium ${
                errors.balance ? "border-rose-loss" : "border-border-subtle"
              }`}
            />
            {errors.balance && (
              <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.balance}</span>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Wallet Color Accent
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {errors.color && (
              <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.color}</span>
            )}
          </div>

          {/* Form Actions Footer */}
          {showDeleteConfirm ? (
            <div className="flex justify-end gap-2 pt-2 items-center">
              <span className="text-xs font-bold text-rose-loss mr-auto animate-pulse">Delete this wallet?</span>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (editingWallet) {
                    await deleteAccount(editingWallet.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-rose-loss hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2 items-center">
              {editingWallet && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 mr-auto rounded-md text-xs font-bold text-rose-loss hover:bg-rose-loss/10 uppercase tracking-wider transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-emerald-primary hover:bg-emerald-600 text-bg-base text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <Check size={14} weight="bold" />
                {editingWallet ? "Save Updates" : "Create Wallet"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

