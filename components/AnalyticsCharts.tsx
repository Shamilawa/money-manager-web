"use client";
import React, { useState } from "react";
import { useFinance, EXPENSE_CATEGORIES } from "../context/FinanceContext";
import { ChartPieSlice, ChartBar, ChartLine, Calendar } from "@phosphor-icons/react";

export const AnalyticsCharts: React.FC = () => {
  const { transactions, getFilteredTransactions, accounts } = useFinance();
  const [activeTab, setActiveTab] = useState<"donut" | "weekly" | "networth">("donut");
  const [hoveredSlice, setHoveredSlice] = useState<{ category: string; amount: number; percent: number } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; amount: number; x: number; y: number } | null>(null);

  const filteredTxs = getFilteredTransactions();

  // 1. DATA PREPARATION: DONUT
  const expenseTxs = filteredTxs.filter(tx => tx.type === "expense");
  const totalExpense = expenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

  const categoryData = EXPENSE_CATEGORIES.map(category => {
    const amount = expenseTxs
      .filter(tx => tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return {
      category,
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    };
  })
  .filter(item => item.amount > 0)
  .sort((a, b) => b.amount - a.amount);

  // Donut chart math
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // 314.159
  let accumulatedPercent = 0;

  // Custom visual colors for donut slices
  const sliceColors = [
    "#10b981", // Emerald
    "#34d399", // Mint
    "#60a5fa", // Blue
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Purple
    "#a1a1aa", // Zinc
    "#6b7280"  // Gray
  ];

  // 2. DATA PREPARATION: WEEKLY (4 WEEKS)
  const getWeeklyData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const periodTxs = transactions.filter(tx => tx.date >= startStr && tx.date <= endStr);
      const income = periodTxs.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
      const expense = periodTxs.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);

      data.push({
        label: i === 0 ? "This Week" : `Wk -${i}`,
        income,
        expense
      });
    }
    return data;
  };
  const weeklyData = getWeeklyData();

  // 3. DATA PREPARATION: NET WORTH (10 DAYS)
  const getNetWorthHistory = () => {
    const days = 10;
    const values: number[] = Array(days).fill(0);
    const dates: string[] = [];
    
    const today = new Date();
    
    // Group delta cash flows
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(today.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      dates.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));

      // Find deltas on this day
      const dayTxs = transactions.filter(tx => tx.date === dateStr);
      const dayDelta = dayTxs.reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);
      values[i] = dayDelta;
    }

    // Cumulative math
    let currentNetWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const history = [];

    // Walk backwards to compute values, then reverse
    for (let i = days - 1; i >= 0; i--) {
      history[i] = {
        date: dates[i],
        amount: currentNetWorth
      };
      currentNetWorth -= values[i];
    }
    return history;
  };
  const netWorthData = getNetWorthHistory();

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-card p-4 glass-border flex flex-col h-full space-y-4">
      {/* Chart Headers */}
      <div className="flex justify-between items-center shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          {activeTab === "donut" && <ChartPieSlice size={14} className="text-emerald-primary" />}
          {activeTab === "weekly" && <ChartBar size={14} className="text-emerald-primary" />}
          {activeTab === "networth" && <ChartLine size={14} className="text-emerald-primary" />}
          <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            {activeTab === "donut" && "Expenses Apportionment"}
            {activeTab === "weekly" && "Weekly Budget Balance"}
            {activeTab === "networth" && "Consolidated Valuation Path"}
          </h3>
        </div>

        {/* Tab toggles */}
        <div className="flex bg-bg-base/80 p-0.5 border border-border-subtle rounded-md select-none">
          <button
            onClick={() => setActiveTab("donut")}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider font-bold rounded-sm cursor-pointer transition ${
              activeTab === "donut" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Donut
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider font-bold rounded-sm cursor-pointer transition ${
              activeTab === "weekly" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTab("networth")}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider font-bold rounded-sm cursor-pointer transition ${
              activeTab === "networth" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Net Worth
          </button>
        </div>
      </div>

      {/* Main Chart Rendering Viewport */}
      <div className="flex-1 flex items-center justify-center min-h-60 relative">
        
        {/* DONUT CHART */}
        {activeTab === "donut" && (
          <div className="w-full flex flex-col md:flex-row items-center justify-around gap-6">
            {/* SVG circle rendering */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {totalExpense === 0 ? (
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke="#1f1f23"
                    strokeWidth="12"
                  />
                ) : (
                  categoryData.map((item, idx) => {
                    const color = sliceColors[idx % sliceColors.length];
                    const strokeLength = (item.percent / 100) * donutCircumference;
                    const strokeOffset = donutCircumference - (accumulatedPercent / 100) * donutCircumference;
                    accumulatedPercent += item.percent;

                    return (
                      <circle
                        key={item.category}
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeDasharray={`${strokeLength} ${donutCircumference - strokeLength}`}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer hover:stroke-[14px]"
                        onMouseEnter={() => setHoveredSlice(item)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    );
                  })
                )}
              </svg>

              {/* Central text display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-4">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-0.5 leading-none">
                  {hoveredSlice ? hoveredSlice.category : "Total Debit"}
                </span>
                <span className="text-lg font-bold font-mono tracking-tight text-white leading-none">
                  LKR {(hoveredSlice ? hoveredSlice.amount : totalExpense).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 mt-1">
                  {hoveredSlice ? `${hoveredSlice.percent.toFixed(1)}%` : "Current filters"}
                </span>
              </div>
            </div>

            {/* Legends list */}
            <div className="space-y-1.5 w-full max-w-[200px] shrink-0">
              {categoryData.length > 0 ? (
                categoryData.map((item, idx) => (
                  <div
                    key={item.category}
                    className="flex justify-between items-center text-xs p-1 rounded-sm hover:bg-zinc-900/50 transition cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(item)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sliceColors[idx % sliceColors.length] }}
                      />
                      <span className="text-zinc-300 truncate font-medium">{item.category}</span>
                    </div>
                    <span className="font-mono text-zinc-400 font-semibold ml-2">
                      LKR {item.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center font-mono text-zinc-500 text-xs">
                  No expense records found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEEKLY BAR CHART */}
        {activeTab === "weekly" && (
          <div className="w-full h-full flex flex-col justify-end p-2">
            <div className="flex-1 flex items-end justify-around gap-2 px-4 border-b border-border-subtle pb-1">
              {weeklyData.map((week, idx) => {
                const maxVal = Math.max(...weeklyData.flatMap(w => [w.income, w.expense])) || 1;
                const incHeight = (week.income / maxVal) * 120; // max height 120px
                const expHeight = (week.expense / maxVal) * 120;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 w-1/4">
                    {/* Bars wrapper */}
                    <div className="flex items-end gap-1.5 h-32 select-none relative group/bar">
                      {/* Income Bar */}
                      <div
                        className="w-3.5 bg-emerald-primary hover:bg-emerald-400 rounded-t-sm transition-all duration-300 cursor-pointer relative"
                        style={{ height: `${incHeight}px` }}
                        title={`Inflow: LKR ${week.income.toLocaleString()}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-3.5 bg-rose-loss hover:bg-rose-400 rounded-t-sm transition-all duration-300 cursor-pointer relative"
                        style={{ height: `${expHeight}px` }}
                        title={`Outflow: LKR ${week.expense.toLocaleString()}`}
                      />
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase select-none">
                      {week.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom Bar Chart Legend */}
            <div className="flex gap-4 justify-center pt-3 text-[10px] font-mono uppercase tracking-wider font-semibold select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-primary rounded-sm" />
                <span className="text-zinc-400">Weekly Credit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-loss rounded-sm" />
                <span className="text-zinc-400">Weekly Debit</span>
              </div>
            </div>
          </div>
        )}

        {/* NET WORTH AREA CHART */}
        {activeTab === "networth" && (
          <div className="w-full h-full flex flex-col justify-end p-2">
            <div className="flex-1 w-full relative">
              {/* Dynamic Line SVG */}
              <svg 
                className="w-full h-full overflow-hidden" 
                viewBox="0 0 400 130" 
                preserveAspectRatio="none"
                onMouseMove={(e) => {
                  const svgEl = e.currentTarget;
                  const rect = svgEl.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentX = x / rect.width;
                  const idx = Math.min(Math.max(Math.floor(percentX * netWorthData.length), 0), netWorthData.length - 1);
                  const pt = netWorthData[idx];

                  const yMin = Math.min(...netWorthData.map(d => d.amount));
                  const yMax = Math.max(...netWorthData.map(d => d.amount));
                  const yRange = yMax - yMin || 1;
                  
                  const pX = (idx / (netWorthData.length - 1)) * 400;
                  const pY = 110 - ((pt.amount - yMin) / yRange) * 90;

                  setHoveredPoint({
                    date: pt.date,
                    amount: pt.amount,
                    x: pX,
                    y: pY
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="networth-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal guidelines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="65" x2="400" y2="65" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="4 4" />

                {/* Path line calculation */}
                {(() => {
                  const yMin = Math.min(...netWorthData.map(d => d.amount));
                  const yMax = Math.max(...netWorthData.map(d => d.amount));
                  const yRange = yMax - yMin || 1;

                  const points = netWorthData.map((d, idx) => {
                    const x = (idx / (netWorthData.length - 1)) * 400;
                    const y = 110 - ((d.amount - yMin) / yRange) * 90;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  });

                  if (points.length === 0) return null;
                  const linePath = `M ${points.join(" L ")}`;
                  const fillPath = `${linePath} L 400 130 L 0 130 Z`;

                  return (
                    <>
                      <path d={fillPath} fill="url(#networth-grad)" />
                      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    </>
                  );
                })()}

                {/* Hover indicator dot */}
                {hoveredPoint && (
                  <>
                    <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2="130" stroke="var(--color-border-subtle)" strokeWidth="1" />
                    <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4.5" fill="#10b981" stroke="#08080a" strokeWidth="1.5" />
                  </>
                )}
              </svg>
            </div>

            {/* Custom Net Worth Tooltip Panel */}
            <div className="h-10 text-center select-none flex items-center justify-center">
              {hoveredPoint ? (
                <div className="text-xs">
                  <span className="font-mono text-zinc-500 mr-2">{hoveredPoint.date}:</span>
                  <span className="font-bold text-white font-mono">${hoveredPoint.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} />
                  Hover chart to inspect valuation milestones (Last 10 Days)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

