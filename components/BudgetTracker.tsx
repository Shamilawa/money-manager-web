"use client";
import React from "react";
import { useFinance } from "../context/FinanceContext";
import { ListBullets, Warning } from "@phosphor-icons/react";
import { preciseSum, parseLocalDate } from "../utils/math";

export const BudgetTracker: React.FC = () => {
  const { budgets, transactions } = useFinance();

  // Aggregate current month's expenses by category
  const today = new Date();
  const currentMonthTxs = transactions.filter(tx => {
    if (tx.type !== "expense") return false;
    const txDate = parseLocalDate(tx.date);
    return (
      txDate.getMonth() === today.getMonth() &&
      txDate.getFullYear() === today.getFullYear()
    );
  });

  const getExpensesByCategory = (category: string): number => {
    return preciseSum(
      currentMonthTxs
        .filter(tx => tx.category === category)
        .map(tx => tx.amount)
    );
  };

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-card p-4 glass-border flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5">
          <ListBullets size={14} className="text-zinc-500" />
          <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            Monthly Category Budgets
          </h3>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 uppercase">
          Current Month Spending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {budgets.map(budget => {
          const spent = getExpensesByCategory(budget.category);
          const ratio = budget.limit > 0 ? spent / budget.limit : 0;
          const percentage = Math.round(ratio * 100);
          
          let barColorClass = "bg-linear-to-r from-emerald-primary to-mint-bright";
          let textColorClass = "text-emerald-primary";
          let alertTriggered = false;

          if (ratio >= 1.0) {
            barColorClass = "bg-linear-to-r from-rose-loss to-red-500";
            textColorClass = "text-rose-loss font-semibold";
            alertTriggered = true;
          } else if (ratio >= 0.8) {
            barColorClass = "bg-linear-to-r from-amber-500 to-yellow-400";
            textColorClass = "text-amber-500 font-semibold";
          }

          return (
            <div key={budget.category} className="space-y-1 group">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1 truncate">
                  {alertTriggered && <Warning size={12} className="text-rose-loss shrink-0 animate-pulse" />}
                  <span className="font-medium text-zinc-300 truncate">{budget.category}</span>
                </div>
                <div className="font-mono text-[10px] space-x-1">
                  <span className="text-white">LKR {spent.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  <span className="text-zinc-500">/</span>
                  <span className="text-zinc-500">LKR {budget.limit}</span>
                  <span className={`ml-1.5 ${textColorClass}`}>({percentage}%)</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-zinc-900/80 h-1.5 rounded-full overflow-hidden border border-border-subtle/50 relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
