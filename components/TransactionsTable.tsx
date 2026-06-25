"use client";
import React, { useState } from "react";
import { useFinance, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../context/FinanceContext";
import type { Transaction } from "../context/FinanceContext";
import { 
  MagnifyingGlass, 
  Trash, 
  PencilSimple, 
  FileCsv, 
  CaretLeft, 
  CaretRight
} from "@phosphor-icons/react";

interface TransactionsTableProps {
  onEditTransaction: (tx: Transaction) => void;
}

const ITEMS_PER_PAGE = 8;

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ onEditTransaction }) => {
  const { 
    accounts, 
    filters, 
    setFilters, 
    getFilteredTransactions, 
    deleteTransaction 
  } = useFinance();

  const [currentPage, setCurrentPage] = useState(1);

  const filteredTxs = getFilteredTransactions();

  // Pagination calculation
  const totalPages = Math.ceil(filteredTxs.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTxs = filteredTxs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, category: e.target.value }));
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, dateRange: e.target.value as any }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, sortBy: e.target.value as any }));
  };

  const getAccountInfo = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? { name: acc.name, color: acc.color } : { name: "Unknown", color: "#71717a" };
  };

  const exportCSV = () => {
    const headers = ["ID", "Date", "Title", "Type", "Category", "Wallet", "Amount", "Notes"];
    const rows = filteredTxs.map(tx => {
      const acc = getAccountInfo(tx.accountId);
      return [
        tx.id,
        tx.date,
        `"${tx.title.replace(/"/g, '""')}"`,
        tx.type,
        tx.category,
        `"${acc.name}"`,
        tx.amount,
        `"${(tx.notes || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aether_ledger_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-card p-4 glass-border space-y-4 flex flex-col h-full">
      {/* Ledger Header controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center justify-between xl:justify-start gap-3">
          <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            Transaction Ledger Log
          </h3>
          
          <button
            onClick={exportCSV}
            className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-border-subtle rounded-md flex items-center gap-1.5 cursor-pointer btn-tactile"
          >
            <FileCsv size={12} />
            CSV Export
          </button>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xl:flex xl:items-center xl:gap-2">
          {/* Search bar */}
          <div className="relative col-span-2 md:col-span-1 xl:w-48">
            <input
              type="text"
              placeholder="Search descriptions..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full bg-bg-base border border-border-subtle rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 font-medium focus:ring-1"
            />
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          </div>

          {/* Category Dropdown */}
          <select
            value={filters.category}
            onChange={handleCategoryChange}
            className="bg-bg-base border border-border-subtle rounded-md px-2 py-1.5 text-xs text-zinc-300 font-medium cursor-pointer focus:ring-1"
          >
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Date Range Dropdown */}
          <select
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            className="bg-bg-base border border-border-subtle rounded-md px-2 py-1.5 text-xs text-zinc-300 font-medium cursor-pointer focus:ring-1"
          >
            <option value="all">All Dates</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={filters.sortBy}
            onChange={handleSortChange}
            className="bg-bg-base border border-border-subtle rounded-md px-2 py-1.5 text-xs text-zinc-300 font-medium cursor-pointer focus:ring-1"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="flex-1 overflow-x-auto min-h-64">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-border-subtle text-[9px] font-mono uppercase tracking-wider text-zinc-500 bg-bg-panel select-none">
              <th className="py-2.5 font-semibold">Date</th>
              <th className="py-2.5 font-semibold">Description</th>
              <th className="py-2.5 font-semibold">Category</th>
              <th className="py-2.5 font-semibold">Wallet</th>
              <th className="py-2.5 font-semibold text-right">Amount</th>
              <th className="py-2.5 font-semibold text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50 text-xs">
            {paginatedTxs.length > 0 ? (
              paginatedTxs.map(tx => {
                const accInfo = getAccountInfo(tx.accountId);
                return (
                  <tr key={tx.id} className="hover:bg-bg-base/40 group transition-colors">
                    <td className="py-2.5 font-mono text-zinc-400 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5 font-medium text-white max-w-[200px] truncate" title={tx.title}>
                      {tx.title}
                      {tx.notes && (
                        <span className="block text-[10px] text-zinc-500 font-normal truncate max-w-[200px]">
                          {tx.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 border border-border-subtle text-zinc-300">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span 
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono border"
                        style={{ 
                          backgroundColor: `${accInfo.color}08`, 
                          borderColor: `${accInfo.color}25`, 
                          color: accInfo.color 
                        }}
                      >
                        {accInfo.name}
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-mono font-bold whitespace-nowrap ${
                      tx.type === "income" ? "text-emerald-primary" : "text-rose-loss"
                    }`}>
                      {tx.type === "income" ? "+LKR " : "-LKR "}{tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap pr-2">
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          title="Edit transaction"
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer btn-tactile"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          title="Delete transaction"
                          className="p-1 hover:bg-rose-loss/10 text-zinc-400 hover:text-rose-loss rounded cursor-pointer btn-tactile"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                  No records match query filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-border-subtle shrink-0">
        <div className="text-[10px] font-mono text-zinc-500 uppercase">
          Showing {filteredTxs.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredTxs.length)} of {filteredTxs.length} transactions
        </div>

        <div className="flex items-center gap-1.5 select-none">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-zinc-900 border border-border-subtle hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed rounded-md cursor-pointer btn-tactile"
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          
          <div className="text-[10px] font-mono text-zinc-400 px-1">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-zinc-900 border border-border-subtle hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-400 disabled:cursor-not-allowed rounded-md cursor-pointer btn-tactile"
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};

