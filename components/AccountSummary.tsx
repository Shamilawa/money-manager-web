"use client";
import React, { useState } from "react";
import { useFinance, type Account } from "../context/FinanceContext";
import { preciseRound } from "../utils/math";
import { ArrowsLeftRight, Bank, CreditCard, PiggyBank, ChartLineUp, ArrowRight, Plus, PencilSimple } from "@phosphor-icons/react";

interface AccountSummaryProps {
  onAddWallet: () => void;
  onEditWallet: (wallet: Account) => void;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({ onAddWallet, onEditWallet }) => {
  const { accounts, transferFunds } = useFinance();
  const [showTransfer, setShowTransfer] = useState(false);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const getAccountIcon = (type: Account["type"]) => {
    switch (type) {
      case "checking":
        return <Bank size={18} />;
      case "savings":
        return <PiggyBank size={18} />;
      case "credit":
        return <CreditCard size={18} />;
      case "investment":
        return <ChartLineUp size={18} />;
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const newErrors: Record<string, string> = {};

    if (!fromAccount) newErrors.fromAccount = "Required";
    if (!toAccount) newErrors.toAccount = "Required";
    if (fromAccount && toAccount && fromAccount === toAccount) {
      newErrors.toAccount = "Must differ from source";
    }

    const value = parseFloat(amount);
    if (!amount || isNaN(value) || value <= 0) {
      newErrors.amount = "Invalid amount";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const roundedValue = preciseRound(value);
    const completed = transferFunds(fromAccount, toAccount, roundedValue);
    if (!completed) {
      setErrors({ form: "Insufficient funds in source account" });
      return;
    }

    setAmount("");
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setShowTransfer(false);
    }, 2000);
  };

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-card p-4 glass-border space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
          Linked Asset Accounts
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddWallet}
            className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-bg-base hover:bg-zinc-800 text-zinc-300 border border-border-subtle rounded-md flex items-center gap-1.5 cursor-pointer btn-tactile"
          >
            <Plus size={12} />
            Add
          </button>
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-border-subtle rounded-md flex items-center gap-1.5 cursor-pointer btn-tactile"
          >
            <ArrowsLeftRight size={12} />
            Transfer
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-3">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className="p-3 bg-bg-base border border-border-subtle hover:border-zinc-800 rounded-lg flex items-center justify-between transition group gap-2 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: `${acc.color}15`, color: acc.color, border: `1px solid ${acc.color}30` }}
              >
                {getAccountIcon(acc.type)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-white block truncate leading-tight">
                  {acc.name}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block truncate">
                  {acc.type}
                </span>
              </div>
            </div>
            <div className="text-right flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold font-mono text-white block">
                LKR {acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button 
                onClick={() => onEditWallet(acc)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-emerald-primary transition-opacity cursor-pointer btn-tactile shrink-0"
                title="Edit Wallet"
              >
                <PencilSimple size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Panel */}
      {showTransfer && (
        <form
          onSubmit={handleTransfer}
          className="p-3 bg-bg-base/60 border border-border-subtle rounded-lg space-y-3 relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-emerald-primary">
              Transfer Drawer
            </span>
            <button
              type="button"
              onClick={() => setShowTransfer(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">From Wallet</label>
              <select
                value={fromAccount}
                onChange={e => {
                  setFromAccount(e.target.value);
                  if (errors.fromAccount) setErrors(prev => ({ ...prev, fromAccount: "" }));
                }}
                className={`w-full text-xs bg-bg-panel border rounded-md px-2 py-1.5 text-white font-medium focus:ring-1 ${errors.fromAccount ? 'border-rose-loss' : 'border-border-subtle'}`}
              >
                <option value="">Select source</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (LKR {acc.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })})
                  </option>
                ))}
              </select>
              {errors.fromAccount && <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.fromAccount}</span>}
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">To Wallet</label>
              <select
                value={toAccount}
                onChange={e => {
                  setToAccount(e.target.value);
                  if (errors.toAccount) setErrors(prev => ({ ...prev, toAccount: "" }));
                }}
                className={`w-full text-xs bg-bg-panel border rounded-md px-2 py-1.5 text-white font-medium focus:ring-1 ${errors.toAccount ? 'border-rose-loss' : 'border-border-subtle'}`}
              >
                <option value="">Select destination</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              {errors.toAccount && <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.toAccount}</span>}
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">Amount ($)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
                  }}
                  className={`w-full text-xs bg-bg-panel border rounded-md pl-2 pr-6 py-1.5 text-white font-mono font-medium focus:ring-1 ${errors.amount ? 'border-rose-loss' : 'border-border-subtle'}`}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 w-5 bg-emerald-primary hover:bg-emerald-600 text-bg-base rounded flex items-center justify-center cursor-pointer btn-tactile"
                >
                  <ArrowRight size={10} weight="bold" />
                </button>
              </div>
              {errors.amount && <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.amount}</span>}
            </div>
          </div>

          {errors.form && (
            <p className="text-[9px] font-mono text-rose-loss leading-none mt-1">
              ⚠️ {errors.form}
            </p>
          )}

          {success && (
            <p className="text-[9px] font-mono text-emerald-primary leading-none mt-1">
              ✓ Transfer successfully logged.
            </p>
          )}
        </form>
      )}
    </div>
  );
};

