"use client";
import React, { useState, useEffect } from "react";
import { useFinance, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../context/FinanceContext";
import type { Transaction } from "../context/FinanceContext";
import { X, Check } from "@phosphor-icons/react";
import { preciseRound } from "../utils/math";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, editingTransaction }) => {
  const { accounts, addTransaction, editTransaction } = useFinance();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset fields when editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title);
      setAmount(editingTransaction.amount.toString());
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || "");
      setDate(editingTransaction.date);
      setNotes(editingTransaction.notes || "");
    } else {
      setTitle("");
      setAmount("");
      setType("expense");
      setCategory(EXPENSE_CATEGORIES[0]);
      setAccountId(accounts[0]?.id || "");
      setToAccountId("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
    setErrors({});
  }, [editingTransaction, isOpen, accounts]);

  // Adjust category if type changes
  useEffect(() => {
    if (!editingTransaction) {
      if (type === "transfer") {
        setCategory("Transfer");
      } else {
        setCategory(type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      }
    }
  }, [type, editingTransaction]);

  // Keypress listener for Escape key
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

    if (!title.trim()) newErrors.title = "Description title is required";
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Enter a valid positive number";
    }

    if (!accountId) newErrors.accountId = "Source wallet is required";
    if (type === "transfer" && !toAccountId) newErrors.toAccountId = "Destination wallet is required";
    if (type === "transfer" && accountId === toAccountId) newErrors.toAccountId = "Cannot transfer to same wallet";
    if (!date) newErrors.date = "Transaction date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const txPayload: Omit<Transaction, "id"> = {
      title: title.trim(),
      amount: preciseRound(parsedAmount),
      type,
      category,
      accountId,
      date,
      notes: notes.trim() || undefined
    };

    if (type === "transfer") {
      txPayload.toAccountId = toAccountId;
    }

    if (editingTransaction) {
      editTransaction({
        ...txPayload,
        id: editingTransaction.id
      });
    } else {
      addTransaction(txPayload);
    }

    onClose();
  };

  const categories = type === "income" ? INCOME_CATEGORIES : (type === "expense" ? EXPENSE_CATEGORIES : ["Transfer"]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-bg-base/80 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Modal Box */}
      <div className="bg-bg-panel border border-border-subtle rounded-card w-full max-w-md relative z-10 glass-border p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border-subtle shrink-0">
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            {editingTransaction ? "Edit Ledger Record" : "Add Ledger Record"}
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
          {/* Type Selector (Tactile Tab Toggle) */}
          <div className="space-y-1.5">
            <span className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500">
              Transaction Flow
            </span>
            <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950/70 border border-border-subtle rounded-md">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-1.5 text-xs font-bold rounded-sm uppercase cursor-pointer btn-tactile tracking-wide ${
                  type === "expense"
                    ? "bg-rose-loss/10 border border-rose-loss/20 text-rose-loss"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Debit (Out)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-1.5 text-xs font-bold rounded-sm uppercase cursor-pointer btn-tactile tracking-wide ${
                  type === "income"
                    ? "bg-emerald-primary/10 border border-emerald-primary/20 text-emerald-primary"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Credit (In)
              </button>
              <button
                type="button"
                onClick={() => setType("transfer")}
                className={`py-1.5 text-xs font-bold rounded-sm uppercase cursor-pointer btn-tactile tracking-wide ${
                  type === "transfer"
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Title & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Description Title
              </label>
              <input
                type="text"
                placeholder="e.g. Whole Foods Market"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                }}
                className={`w-full bg-bg-base border rounded-md px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 font-medium ${
                  errors.title ? "border-rose-loss" : "border-border-subtle"
                }`}
              />
              {errors.title && (
                <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.title}</span>
              )}
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Amount (LKR)
              </label>
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
                className={`w-full bg-bg-base border rounded-md px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600 font-medium ${
                  errors.amount ? "border-rose-loss" : "border-border-subtle"
                }`}
              />
              {errors.amount && (
                <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.amount}</span>
              )}
            </div>
          </div>

          {/* Category & Wallet Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== "transfer" ? (
              <>
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Ledger Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-bg-base border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white font-medium cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Asset Wallet
                  </label>
                  <select
                    value={accountId}
                    onChange={e => {
                      setAccountId(e.target.value);
                      if (errors.accountId) setErrors(prev => ({ ...prev, accountId: "" }));
                    }}
                    className={`w-full bg-bg-base border rounded-md px-2 py-1.5 text-xs text-white font-medium cursor-pointer ${
                      errors.accountId ? "border-rose-loss" : "border-border-subtle"
                    }`}
                  >
                    <option value="">Choose wallet</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  {errors.accountId && (
                    <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.accountId}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    From Wallet (Source)
                  </label>
                  <select
                    value={accountId}
                    onChange={e => {
                      setAccountId(e.target.value);
                      if (errors.accountId) setErrors(prev => ({ ...prev, accountId: "" }));
                      if (errors.toAccountId) setErrors(prev => ({ ...prev, toAccountId: "" }));
                    }}
                    className={`w-full bg-bg-base border rounded-md px-2 py-1.5 text-xs text-white font-medium cursor-pointer ${
                      errors.accountId ? "border-rose-loss" : "border-border-subtle"
                    }`}
                  >
                    <option value="">Select source</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  {errors.accountId && (
                    <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.accountId}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    To Wallet (Destination)
                  </label>
                  <select
                    value={toAccountId}
                    onChange={e => {
                      setToAccountId(e.target.value);
                      if (errors.toAccountId) setErrors(prev => ({ ...prev, toAccountId: "" }));
                    }}
                    className={`w-full bg-bg-base border rounded-md px-2 py-1.5 text-xs text-white font-medium cursor-pointer ${
                      errors.toAccountId ? "border-rose-loss" : "border-border-subtle"
                    }`}
                  >
                    <option value="">Select destination</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  {errors.toAccountId && (
                    <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.toAccountId}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Transaction Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: "" }));
              }}
              className={`w-full bg-bg-base border rounded-md px-2.5 py-1.5 text-xs text-white font-mono font-medium ${
                errors.date ? "border-rose-loss" : "border-border-subtle"
              }`}
            />
            {errors.date && (
              <span className="text-[9px] font-mono text-rose-loss mt-0.5 block">{errors.date}</span>
            )}
          </div>

          {/* Notes Selector */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Memo / Notes (Optional)
            </label>
            <textarea
              placeholder="Provide transaction details or metadata..."
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-bg-base border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 font-medium resize-none"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="flex gap-2 pt-3 border-t border-border-subtle justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold uppercase font-mono tracking-wide text-zinc-400 bg-transparent hover:bg-zinc-800 hover:text-zinc-200 border border-border-subtle rounded-md cursor-pointer btn-tactile"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold uppercase font-mono tracking-wide bg-emerald-primary text-bg-base hover:bg-emerald-600 rounded-md flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <Check size={12} weight="bold" />
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

