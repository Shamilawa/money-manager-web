import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { preciseSum, preciseRound } from "../utils/math";
import { CreditCard, Bank, CalendarBlank, ChartLineUp, HandCoins } from "@phosphor-icons/react";
import { TransactionModal } from "./TransactionModal";

export const DebtManager: React.FC = () => {
  const { accounts } = useFinance();
  const [payTargetAccountId, setPayTargetAccountId] = useState<string | null>(null);

  const debts = accounts.filter(acc => acc.type === "credit" || acc.type === "loan");
  
  if (debts.length === 0) {
    return null; // Hide if no debts exist
  }

  const totalOutstanding = preciseSum(debts.map(acc => acc.balance)); // Balances are stored negative
  
  // Calculate utilization (only for credit cards with limits)
  const creditCards = debts.filter(acc => acc.type === "credit");
  const totalCreditLimit = preciseSum(creditCards.map(acc => acc.creditLimit || 0));
  const creditCardOutstanding = preciseSum(creditCards.map(acc => acc.balance));
  
  const utilization = totalCreditLimit > 0 
    ? preciseRound((Math.abs(creditCardOutstanding) / totalCreditLimit) * 100) 
    : 0;

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-card p-5 glass-border shadow-xl h-full flex flex-col relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-loss/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-rose-loss/10 transition-colors duration-700" />
      
      {/* Header */}
      <div className="flex justify-between items-end mb-4 relative z-10 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <HandCoins size={14} className="text-rose-loss/70" />
            <h2 className="text-[10px] font-mono tracking-widest uppercase font-semibold">Liability & Debt Control</h2>
          </div>
          <p className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            LKR {Math.abs(totalOutstanding).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-mono text-rose-loss tracking-wider bg-rose-loss/10 px-1.5 py-0.5 rounded border border-rose-loss/20 uppercase">
              Total Owed
            </span>
          </p>
        </div>
        {totalCreditLimit > 0 && (
          <div className="text-right">
            <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase mb-0.5">Credit Utilization</div>
            <div className={`text-sm font-bold font-mono ${utilization > 30 ? "text-rose-loss" : "text-emerald-primary"}`}>
              {utilization}%
            </div>
          </div>
        )}
      </div>

      {/* Debt List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 relative z-10 scrollbar-hide">
        {debts.map(debt => {
          const limit = debt.creditLimit || 0;
          const pct = limit > 0 ? preciseRound((Math.abs(debt.balance) / limit) * 100) : 0;
          
          return (
            <div key={debt.id} className="p-3 bg-zinc-900/50 rounded-md border border-border-subtle hover:border-zinc-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center shadow-inner" style={{ color: debt.color }}>
                    {debt.type === "credit" ? <CreditCard size={14} /> : <Bank size={14} />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">{debt.name}</h3>
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <span>{debt.type === "credit" ? "Credit" : "Loan"}</span>
                      {debt.interestRate && (
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <ChartLineUp size={10} /> {debt.interestRate}% APR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-rose-loss">
                    LKR {Math.abs(debt.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  {debt.minimumPayment && (
                    <div className="text-[9px] font-mono text-zinc-400">
                      Min Pay: LKR {debt.minimumPayment.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {debt.type === "credit" && limit > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1">
                    <span>Limit Used</span>
                    <span>LKR {limit.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${pct > 80 ? "bg-rose-loss" : pct > 30 ? "bg-orange-500" : "bg-emerald-primary"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border-subtle flex justify-between items-center">
                <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <CalendarBlank size={12} className="text-zinc-500" />
                  {debt.dueDate ? `Due on the ${debt.dueDate}${[1, 21, 31].includes(debt.dueDate) ? 'st' : [2, 22].includes(debt.dueDate) ? 'nd' : [3, 23].includes(debt.dueDate) ? 'rd' : 'th'}` : "No due date set"}
                </div>
                <button
                  onClick={() => setPayTargetAccountId(debt.id)}
                  className="px-2 py-1 text-[9px] font-bold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 text-white rounded cursor-pointer transition-colors border border-border-subtle hover:border-zinc-600"
                >
                  Log Payment
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Transaction Modal triggered by Pay button */}
      {/* We are passing a preset transaction configuration to TransactionModal. We need to add preset support or just open standard transfer modal. */}
    </div>
  );
};
