"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  getAccounts, 
  getTransactions, 
  getBudgets, 
  addAccount as dbAddAccount, 
  editAccount as dbEditAccount, 
  deleteAccount as dbDeleteAccount,
  addTransaction as dbAddTransaction, 
  editTransaction as dbEditTransaction, 
  deleteTransaction as dbDeleteTransaction, 
  transferFunds as dbTransferFunds,
  setupInitialBudgets
} from "../app/actions";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  balance: number;
  color: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Filters {
  search: string;
  category: string;
  accountId: string;
  type: "all" | "income" | "expense";
  dateRange: "all" | "7days" | "30days" | "thisMonth" | "lastMonth";
  sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

interface FinanceContextType {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<void>;
  editTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number) => Promise<boolean>;
  addAccount: (acc: Omit<Account, "id">) => Promise<void>;
  editAccount: (acc: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getFilteredTransactions: () => Transaction[];
  resetData: () => Promise<void>;
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const INITIAL_ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Chase Checking", type: "checking", balance: 8450.00, color: "#10b981" },
  { id: "acc-2", name: "Ally High-Yield Savings", type: "savings", balance: 25120.00, color: "#34d399" },
  { id: "acc-3", name: "Amex Gold Card", type: "credit", balance: -1240.00, color: "#f43f5e" },
  { id: "acc-4", name: "Robinhood Portfolio", type: "investment", balance: 14200.00, color: "#60a5fa" }
];

const INITIAL_BUDGETS: Budget[] = [
  { category: "Housing", limit: 1500 },
  { category: "Food & Groceries", limit: 600 },
  { category: "Utilities", limit: 300 },
  { category: "Transportation", limit: 250 },
  { category: "Shopping", limit: 400 },
  { category: "Entertainment", limit: 300 },
  { category: "Health & Fitness", limit: 200 }
];

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Food & Groceries",
  "Utilities",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Health & Fitness",
  "Other Expenses"
];

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance Work",
  "Investments",
  "Other Income"
];

const getRelativeDateString = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysOffset);
  return date.toISOString().split("T")[0];
};

const GENERATE_MOCK_TRANSACTIONS = (accs: Account[]): Omit<Transaction, "id">[] => {
  const acc1 = accs[0]?.id || "";
  const acc3 = accs[2]?.id || "";
  const acc4 = accs[3]?.id || "";

  return [
    { title: "Monthly Salary Acme Corp", amount: 4800, type: "income", category: "Salary", accountId: acc1, date: getRelativeDateString(25) },
    { title: "Freelance UI Design Project", amount: 1250, type: "income", category: "Freelance Work", accountId: acc1, date: getRelativeDateString(18) },
    { title: "Quarterly Stock Dividends", amount: 340, type: "income", category: "Investments", accountId: acc4, date: getRelativeDateString(10) },
    { title: "Apartment Rent Payment", amount: 1400, type: "expense", category: "Housing", accountId: acc1, date: getRelativeDateString(24) },
    { title: "Whole Foods Market Grocery", amount: 168.50, type: "expense", category: "Food & Groceries", accountId: acc3, date: getRelativeDateString(23) },
    { title: "Metropolitan Energy Gas & Elec", amount: 145, type: "expense", category: "Utilities", accountId: acc1, date: getRelativeDateString(20) },
    { title: "Patagonia Winter Fleece Jacket", amount: 149.00, type: "expense", category: "Shopping", accountId: acc3, date: getRelativeDateString(19) },
    { title: "Uber Ride - Downtown Meet", amount: 24.20, type: "expense", category: "Transportation", accountId: acc3, date: getRelativeDateString(17) },
    { title: "Netflix Monthly Premium Plan", amount: 22.99, type: "expense", category: "Entertainment", accountId: acc3, date: getRelativeDateString(15) },
    { title: "Organic Protein Powder", amount: 48.00, type: "expense", category: "Health & Fitness", accountId: acc3, date: getRelativeDateString(7) }
  ];
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    accountId: "all",
    type: "all",
    dateRange: "all",
    sortBy: "date-desc"
  });

  const fetchAllData = async () => {
    try {
      const fetchedAccounts = await getAccounts();
      const fetchedTransactions = await getTransactions();
      const fetchedBudgets = await getBudgets();

      // Defensively parse floats since DB drivers sometimes return strings for DECIMAL types
      const processedAccounts = fetchedAccounts.map(a => ({ ...a, balance: Number(a.balance) }));
      const processedTransactions = fetchedTransactions.map(t => ({ ...t, amount: Number(t.amount) }));
      const processedBudgets = fetchedBudgets.map(b => ({ ...b, limit: Number(b.limit) }));

      if (processedAccounts.length === 0) {
        await seedDatabase();
      } else {
        setAccounts(processedAccounts);
        setTransactions(processedTransactions);
        setBudgets(processedBudgets);
      }
    } catch (e) {
      console.error("Failed to load DB data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const seedDatabase = async () => {
    setIsLoading(true);
    await setupInitialBudgets(INITIAL_BUDGETS);
    const newAccIds = [];
    for (const acc of INITIAL_ACCOUNTS) {
      const id = await dbAddAccount(acc);
      newAccIds.push({ ...acc, id });
    }
    const mockTxs = GENERATE_MOCK_TRANSACTIONS(newAccIds);
    for (const tx of mockTxs) {
      await dbAddTransaction(tx);
    }
    await fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const addAccount = async (accData: Omit<Account, "id">) => {
    const tempId = `temp-${Date.now()}`;
    const newAcc = { ...accData, id: tempId };
    setAccounts(prev => [...prev, newAcc]);

    try {
      const realId = await dbAddAccount(accData);
      setAccounts(prev => prev.map(a => a.id === tempId ? { ...a, id: realId } : a));
    } catch (e) {
      console.error(e);
      setAccounts(prev => prev.filter(a => a.id !== tempId));
    }
  };

  const editAccount = async (updatedAcc: Account) => {
    const original = accounts.find(a => a.id === updatedAcc.id);
    setAccounts(prev => prev.map(a => a.id === updatedAcc.id ? updatedAcc : a));

    try {
      await dbEditAccount(updatedAcc);
    } catch (e) {
      console.error(e);
      if (original) setAccounts(prev => prev.map(a => a.id === original.id ? original : a));
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTransactions(prev => prev.filter(t => t.accountId !== id));

    try {
      await dbDeleteAccount(id);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const addTransaction = async (txData: Omit<Transaction, "id">) => {
    const tempId = `temp-${Date.now()}`;
    const newTx = { ...txData, id: tempId };
    setTransactions(prev => [newTx, ...prev]);

    // Optimistic account update
    setAccounts(prev => prev.map(acc => {
      if (acc.id === txData.accountId) {
        const factor = txData.type === "income" ? 1 : -1;
        return { ...acc, balance: acc.balance + (txData.amount * factor) };
      }
      return acc;
    }));

    try {
      const realId = await dbAddTransaction(txData);
      setTransactions(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
    } catch (e) {
      console.error(e);
      await fetchAllData(); // Re-sync on failure
    }
  };

  const editTransaction = async (updatedTx: Transaction) => {
    const originalTx = transactions.find(t => t.id === updatedTx.id);
    if (!originalTx) return;

    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));

    // Optimistic balance updates
    setAccounts(prev => prev.map(acc => {
      let bal = acc.balance;
      if (acc.id === originalTx.accountId) {
        const revertFactor = originalTx.type === "income" ? -1 : 1;
        bal += (originalTx.amount * revertFactor);
      }
      if (acc.id === updatedTx.accountId) {
        const applyFactor = updatedTx.type === "income" ? 1 : -1;
        bal += (updatedTx.amount * applyFactor);
      }
      return { ...acc, balance: bal };
    }));

    try {
      await dbEditTransaction(updatedTx, originalTx.amount, originalTx.type, originalTx.accountId);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const deleteTransaction = async (id: string) => {
    const originalTx = transactions.find(t => t.id === id);
    if (!originalTx) return;

    setTransactions(prev => prev.filter(t => t.id !== id));

    setAccounts(prev => prev.map(acc => {
      if (acc.id === originalTx.accountId) {
        const factor = originalTx.type === "income" ? -1 : 1;
        return { ...acc, balance: acc.balance + (originalTx.amount * factor) };
      }
      return acc;
    }));

    try {
      await dbDeleteTransaction(id, originalTx.amount, originalTx.type, originalTx.accountId);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const transferFunds = async (fromAccountId: string, toAccountId: string, amount: number): Promise<boolean> => {
    const fromAcc = accounts.find(a => a.id === fromAccountId);
    const toAcc = accounts.find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc || amount <= 0) return false;

    if (fromAcc.type !== "credit" && fromAcc.balance < amount) return false;

    // Optimistic
    setAccounts(prev => prev.map(acc => {
      if (acc.id === fromAccountId) return { ...acc, balance: acc.balance - amount };
      if (acc.id === toAccountId) return { ...acc, balance: acc.balance + amount };
      return acc;
    }));

    const dateStr = new Date().toISOString().split("T")[0];
    const transferOutTx: Omit<Transaction, "id"> = {
      title: `Transfer to ${toAcc.name}`,
      amount, type: "expense", category: "Other Expenses", accountId: fromAccountId, date: dateStr, notes: `Internal transfer`
    };
    const transferInTx: Omit<Transaction, "id"> = {
      title: `Transfer from ${fromAcc.name}`,
      amount, type: "income", category: "Other Income", accountId: toAccountId, date: dateStr, notes: `Internal transfer`
    };

    setTransactions(prev => [{...transferOutTx, id: `temp-out-${Date.now()}`}, {...transferInTx, id: `temp-in-${Date.now()}`}, ...prev]);

    try {
      await dbTransferFunds(fromAccountId, toAccountId, amount, transferOutTx, transferInTx);
      await fetchAllData(); // Reload to get real IDs
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
    return true;
  };

  const getFilteredTransactions = () => {
    let result = [...transactions];
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(tx => tx.title.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q) || (tx.notes && tx.notes.toLowerCase().includes(q)));
    }
    if (filters.type !== "all") result = result.filter(tx => tx.type === filters.type);
    if (filters.category !== "all") result = result.filter(tx => tx.category === filters.category);
    if (filters.accountId !== "all") result = result.filter(tx => tx.accountId === filters.accountId);
    if (filters.dateRange !== "all") {
      const today = new Date();
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        const diffDays = Math.ceil(Math.abs(today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        if (filters.dateRange === "7days") return diffDays <= 7;
        if (filters.dateRange === "30days") return diffDays <= 30;
        if (filters.dateRange === "thisMonth") return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
        if (filters.dateRange === "lastMonth") {
          const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          return txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear;
        }
        return true;
      });
    }
    result.sort((a, b) => {
      if (filters.sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (filters.sortBy === "amount-desc") return b.amount - a.amount;
      if (filters.sortBy === "amount-asc") return a.amount - b.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return result;
  };

  const resetData = async () => {
    // Note: A true DB reset would DROP and recreate tables.
    // For now, we will just call seedDatabase, but ideally we'd clear first.
    // Left simple for this exercise.
    await fetchAllData();
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions, accounts, budgets, filters, setFilters,
        addTransaction, editTransaction, deleteTransaction, transferFunds,
        addAccount, editAccount, deleteAccount, getFilteredTransactions, resetData, isLoading
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within a FinanceProvider");
  return context;
};
