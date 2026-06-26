"use client";
import React from "react";
import { useFinance } from "../context/FinanceContext";
import { TrendUp, TrendDown, CurrencyDollar, ArrowUpRight, ArrowDownLeft } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { preciseAdd, preciseSubtract, preciseSum, parseLocalDate, getCalendarDaysDifference } from "../utils/math";

export const Overview: React.FC = () => {
  const { accounts, getFilteredTransactions } = useFinance();
  const shouldReduceMotion = useReducedMotion();
  const filteredTxs = getFilteredTransactions();

  // Calculations
  const netWorth = preciseSum(accounts.map(acc => acc.balance));
  
  const totalIncome = preciseSum(
    filteredTxs
      .filter(tx => tx.type === "income")
      .map(tx => tx.amount)
  );

  const totalExpense = preciseSum(
    filteredTxs
      .filter(tx => tx.type === "expense")
      .map(tx => tx.amount)
  );

  const netSavings = preciseSubtract(totalIncome, totalExpense);
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Helper to generate sparkline SVG path coordinates for last 10 days
  const generateSparklinePath = (type: "income" | "expense" | "networth", width: number, height: number): string => {
    const days = 10;
    const values: number[] = Array(days).fill(0);
    
    // Group transactions by day index (0 = today, 9 = 9 days ago)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    filteredTxs.forEach(tx => {
      const txDate = parseLocalDate(tx.date);
      const diffDays = getCalendarDaysDifference(today, txDate);
      
      if (diffDays >= 0 && diffDays < days) {
        const index = days - 1 - diffDays; // reverse order so left is past, right is today
        if (type === "networth") {
          // cumulative effect or just general activity
          values[index] = tx.type === "income" ? preciseAdd(values[index], tx.amount) : preciseSubtract(values[index], tx.amount);
        } else if (tx.type === type) {
          values[index] = preciseAdd(values[index], tx.amount);
        }
      }
    });

    // For net worth, calculate relative cumulative balance
    if (type === "networth") {
      let temp = netWorth;
      // Start backwards from today's netWorth
      for (let i = days - 1; i >= 0; i--) {
        const diff = values[i];
        values[i] = temp;
        temp = preciseSubtract(temp, diff); // reverse the transaction
      }
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Map to SVG coordinates
    const points = values.map((val, idx) => {
      const x = (idx / (days - 1)) * width;
      const y = height - 10 - ((val - min) / range) * (height - 20); // 10px padding top/bottom
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    if (points.length === 0) return "";
    return `M ${points.join(" L ")}`;
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
         duration: 0.45,
         delay: custom * 0.08,
         ease: [0.16, 1, 0.3, 1] as const
      }
    })
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Net Worth Card */}
      <motion.div
        variants={cardVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
        custom={0}
        className="bg-bg-panel border border-border-subtle rounded-card p-4.5 relative overflow-hidden glass-border group hover:border-zinc-700 transition duration-200"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
              Net Assets Value
            </p>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white leading-none">
              LKR {netWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-border-subtle flex items-center justify-center text-zinc-400 group-hover:text-emerald-primary transition duration-150">
            <CurrencyDollar size={16} />
          </div>
        </div>

        {/* Sparkline background */}
        <div className="h-10 mt-4 flex items-end">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 180 40" preserveAspectRatio="none">
            <path
              d={generateSparklinePath("networth", 180, 40)}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-75 group-hover:opacity-100 transition-opacity"
            />
          </svg>
        </div>
      </motion.div>

      {/* Income Card */}
      <motion.div
        variants={cardVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
        custom={1}
        className="bg-bg-panel border border-border-subtle rounded-card p-4.5 relative overflow-hidden glass-border group hover:border-zinc-700 transition duration-200"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
              Total Inflows
            </p>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-emerald-primary leading-none">
              +LKR {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-md bg-emerald-primary/5 border border-emerald-primary/10 flex items-center justify-center text-emerald-primary">
            <ArrowDownLeft size={16} />
          </div>
        </div>

        <div className="h-10 mt-4 flex items-end">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 180 40" preserveAspectRatio="none">
            <path
              d={generateSparklinePath("income", 180, 40)}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-75 group-hover:opacity-100 transition-opacity"
            />
          </svg>
        </div>
      </motion.div>

      {/* Expense Card */}
      <motion.div
        variants={cardVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
        custom={2}
        className="bg-bg-panel border border-border-subtle rounded-card p-4.5 relative overflow-hidden glass-border group hover:border-zinc-700 transition duration-200"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
              Total Outflows
            </p>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-rose-loss leading-none">
              -LKR {totalExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-md bg-rose-loss/5 border border-rose-loss/10 flex items-center justify-center text-rose-loss">
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="h-10 mt-4 flex items-end">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 180 40" preserveAspectRatio="none">
            <path
              d={generateSparklinePath("expense", 180, 40)}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-75 group-hover:opacity-100 transition-opacity"
            />
          </svg>
        </div>
      </motion.div>

      {/* Savings Rate Card */}
      <motion.div
        variants={cardVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
        custom={3}
        className="bg-bg-panel border border-border-subtle rounded-card p-4.5 relative overflow-hidden glass-border group hover:border-zinc-700 transition duration-200"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">
              Savings Velocity
            </p>
            <h3 className={`text-2xl font-bold font-mono tracking-tight leading-none ${savingsRate >= 20 ? "text-emerald-primary" : "text-zinc-400"}`}>
              {savingsRate.toFixed(1)}%
            </h3>
          </div>
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-border-subtle flex items-center justify-center text-zinc-400">
            {savingsRate >= 0 ? <TrendUp size={16} className="text-emerald-primary" /> : <TrendDown size={16} className="text-rose-loss" />}
          </div>
        </div>

        {/* Dynamic visual indicator for savings rate */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
            <span>Net Monthly Saving</span>
            <span className={netSavings >= 0 ? "text-emerald-primary" : "text-rose-loss"}>
              {netSavings >= 0 ? "+LKR " : "-LKR "}{Math.abs(netSavings).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${netSavings >= 0 ? "bg-emerald-primary" : "bg-rose-loss"}`}
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
