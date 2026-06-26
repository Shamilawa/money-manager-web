"use client";

import React, { useState } from "react";
import { FinanceProvider, type Transaction } from "../context/FinanceContext";
import { Sidebar } from "../components/Sidebar";
import { Overview } from "../components/Overview";
import { AccountSummary } from "../components/AccountSummary";
import { BudgetTracker } from "../components/BudgetTracker";
import { TransactionsTable } from "../components/TransactionsTable";
import { TransactionModal } from "../components/TransactionModal";
import { WalletModal } from "../components/WalletModal";
import { DebtManager } from "../components/DebtManager";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { Plus, List, X, Calendar, CircleNotch } from "@phosphor-icons/react";
import { useFinance } from "../context/FinanceContext";
import type { Account } from "../context/FinanceContext";

const AppContent: React.FC = () => {
  const { isLoading } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Account | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleNewTx = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditWallet = (wallet: Account) => {
    setEditingWallet(wallet);
    setIsWalletModalOpen(true);
  };

  const handleNewWallet = () => {
    setEditingWallet(null);
    setIsWalletModalOpen(true);
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="flex h-screen bg-bg-base text-zinc-100 overflow-hidden font-sans relative">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative w-64 h-full bg-bg-sidebar border-r border-border-subtle z-10 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-border-subtle">
              <span className="font-mono text-xs font-bold text-emerald-primary uppercase tracking-widest">
                Aether Drawer
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Primary Dashboard Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Cockpit Navbar */}
        <header className="h-16 border-b border-border-subtle bg-bg-panel/40 flex items-center justify-between px-4 sm:px-6 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 bg-zinc-900 border border-border-subtle rounded-md text-zinc-400 hover:text-white cursor-pointer btn-tactile"
            >
              <List size={16} />
            </button>
            
            {/* Header info */}
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                Asset Control Center
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                <Calendar size={11} />
                <span>{todayStr}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Call */}
          <button
            onClick={handleNewTx}
            className="px-3 py-1.5 bg-emerald-primary text-bg-base hover:bg-emerald-600 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer btn-tactile shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <Plus size={13} weight="bold" />
            Record Transaction
          </button>
        </header>

        {/* Scrollable Layout Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
              <CircleNotch size={32} className="text-emerald-primary animate-spin" />
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">Syncing with Vercel Postgres...</p>
            </div>
          ) : (
            <>
              {/* Overview Cards (Net worth, Inflows, Outflows, Savings) */}
              <section aria-label="KPI Overview">
                <Overview />
              </section>

              {/* Grid Layout splits into main vs secondary charts columns */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                
                {/* Left: Charts and Ledger transactions log */}
                <div className="xl:col-span-8 space-y-4">
                  <section aria-label="Analytics Visualizers" className="h-[340px]">
                    <AnalyticsCharts />
                  </section>
                  
                  <section aria-label="Ledger transactions records" className="h-[490px]">
                    <TransactionsTable 
                      onEditTransaction={handleEditTx} 
                    />
                  </section>
                </div>

                {/* Right: Wallet summary and Budgets progress bars */}
                <div className="xl:col-span-4 space-y-4 flex flex-col justify-between">
                  <section aria-label="Connected Wallets Summary">
                    <AccountSummary 
                      onAddWallet={handleNewWallet}
                      onEditWallet={handleEditWallet}
                    />
                  </section>

                  <section aria-label="Debt Management">
                    <DebtManager />
                  </section>

                  <section aria-label="Budgets Tracking" className="flex-1 min-h-[300px]">
                    <BudgetTracker />
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Transaction creation/modification Dialog */}
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingTransaction={editingTransaction}
      />

      {/* Wallet creation/modification Dialog */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        editingWallet={editingWallet}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
