"use client";
import React from "react";
import { useFinance } from "../context/FinanceContext";
import { preciseSum } from "../utils/math";
import { 
  Wallet, 
  Funnel, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  ArrowsClockwise, 
  ListBullets 
} from "@phosphor-icons/react";

export const Sidebar: React.FC = () => {
  const { accounts, filters, setFilters, resetData, transactions } = useFinance();

  const handleTypeChange = (type: "all" | "income" | "expense") => {
    setFilters(prev => ({ ...prev, type }));
  };

  const handleAccountChange = (accountId: string) => {
    setFilters(prev => ({ ...prev, accountId }));
  };

  const totalBalance = preciseSum(accounts.map(acc => acc.balance));

  return (
    <aside className="w-68 bg-bg-sidebar border-r border-border-subtle flex flex-col h-full shrink-0 select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle gap-2.5">
        <div className="w-7 h-7 rounded-md bg-linear-to-tr from-emerald-primary to-mint-bright flex items-center justify-center font-mono font-bold text-bg-base text-sm shadow-[0_0_12px_rgba(16,185,129,0.3)]">
          Λ
        </div>
        <div>
          <span className="font-mono text-[11px] font-bold tracking-[0.25em] text-emerald-primary block uppercase leading-none">
            AETHER
          </span>
          <span className="text-xs font-bold text-zinc-400 tracking-[0.05em]">
            Ledger & Asset SPA
          </span>
        </div>
      </div>

      {/* Net Asset Cockpit */}
      <div className="p-5 border-b border-border-subtle bg-bg-panel/40">
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
          <Wallet size={13} />
          <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
            Consolidated Net Worth
          </span>
        </div>
        <div className="text-xl font-bold tracking-tight text-white font-mono">
          LKR {totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-mono">
          <span>{transactions.length} ledger logs active</span>
        </div>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Ledger Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-500 px-2">
            <Funnel size={12} />
            <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
              Log Filter
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleTypeChange("all")}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer btn-tactile ${
                filters.type === "all"
                  ? "bg-zinc-800/80 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <ListBullets size={14} className="text-zinc-500" />
                <span>All Transactions</span>
              </div>
            </button>
            <button
              onClick={() => handleTypeChange("income")}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer btn-tactile ${
                filters.type === "income"
                  ? "bg-emerald-primary/10 text-emerald-primary font-semibold border border-emerald-primary/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowDownLeft size={14} className="text-emerald-primary/70" />
                <span>Inflows (Credit)</span>
              </div>
            </button>
            <button
              onClick={() => handleTypeChange("expense")}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer btn-tactile ${
                filters.type === "expense"
                  ? "bg-rose-loss/10 text-rose-loss font-semibold border border-rose-loss/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight size={14} className="text-rose-loss/70" />
                <span>Outflows (Debit)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Wallets & Accounts */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-500 px-2">
            <Coins size={12} />
            <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
              Asset Wallets
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleAccountChange("all")}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer btn-tactile ${
                filters.accountId === "all"
                  ? "bg-zinc-800/80 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <span>All Wallets</span>
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleAccountChange(acc.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between cursor-pointer btn-tactile ${
                  filters.accountId === acc.id
                    ? "bg-zinc-800/85 text-white font-semibold border-l-2"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
                style={{ borderLeftColor: filters.accountId === acc.id ? acc.color : undefined }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span className="truncate">{acc.name}</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  LKR {acc.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="p-4 border-t border-border-subtle bg-bg-panel/20">
        <button
          onClick={resetData}
          className="w-full py-1.5 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-border-subtle rounded-md text-[10px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer btn-tactile"
        >
          <ArrowsClockwise size={12} />
          Reset Demo Data
        </button>
      </div>
    </aside>
  );
};

