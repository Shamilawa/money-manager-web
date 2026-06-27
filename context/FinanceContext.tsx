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
  setupInitialBudgets,
  setPrimaryAccount as dbSetPrimaryAccount
} from "../app/actions";
import { 
  preciseAdd, 
  preciseSubtract, 
  preciseRound, 
  parseLocalDate, 
  getCalendarDaysDifference 
} from "../utils/math";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  accountId: string;
  toAccountId?: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "loan";
  balance: number;
  color: string;
  interestRate?: number;
  creditLimit?: number;
  minimumPayment?: number;
  dueDate?: number;
  isPrimary?: boolean;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Filters {
  search: string;
  category: string;
  accountId: string;
  type: "all" | "income" | "expense" | "transfer";
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
  setPrimaryAccount: (id: string) => Promise<void>;
  getFilteredTransactions: () => Transaction[];
  resetData: () => Promise<void>;
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const INITIAL_ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Chase Checking", type: "checking", balance: 8450.00, color: "#10b981" },
  { id: "acc-2", name: "Ally High-Yield Savings", type: "savings", balance: 25120.00, color: "#34d399" },
  { id: "acc-3", name: "Amex Gold Card", type: "credit", balance: -1240.00, color: "#f43f5e", interestRate: 19.99, creditLimit: 15000, minimumPayment: 50, dueDate: 15 },
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

      // Defensively parse precise floats since DB drivers sometimes return strings for DECIMAL types
      const processedAccounts = fetchedAccounts.map(a => ({ ...a, balance: preciseRound(a.balance) }));
      const processedTransactions = fetchedTransactions.map(t => ({ ...t, amount: preciseRound(t.amount) }));
      const processedBudgets = fetchedBudgets.map(b => ({ ...b, limit: preciseRound(b.limit) }));

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
    const newAcc = { ...accData, id: tempId, balance: preciseRound(accData.balance) };
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
    const roundedAcc = { ...updatedAcc, balance: preciseRound(updatedAcc.balance) };
    const original = accounts.find(a => a.id === roundedAcc.id);
    setAccounts(prev => prev.map(a => a.id === roundedAcc.id ? roundedAcc : a));

    try {
      await dbEditAccount(roundedAcc);
    } catch (e) {
      console.error(e);
      if (original) setAccounts(prev => prev.map(a => a.id === original.id ? original : a));
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTransactions(prev => prev.filter(t => t.accountId !== id && t.toAccountId !== id));

    try {
      await dbDeleteAccount(id);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const setPrimaryAccount = async (id: string) => {
    setAccounts(prev => prev.map(a => ({ ...a, isPrimary: a.id === id })));
    try {
      await dbSetPrimaryAccount(id);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const addTransaction = async (txData: Omit<Transaction, "id">) => {
    const tempId = `temp-${Date.now()}`;
    const roundedTx = { ...txData, id: tempId, amount: preciseRound(txData.amount) };
    setTransactions(prev => [roundedTx, ...prev]);

    // Optimistic account update
    setAccounts(prev => prev.map(acc => {
      if (roundedTx.type === "transfer" && roundedTx.toAccountId) {
        if (acc.id === roundedTx.accountId) return { ...acc, balance: preciseSubtract(acc.balance, roundedTx.amount) };
        if (acc.id === roundedTx.toAccountId) return { ...acc, balance: preciseAdd(acc.balance, roundedTx.amount) };
      } else {
        if (acc.id === roundedTx.accountId) {
          const factor = roundedTx.type === "income" ? 1 : -1;
          const delta = preciseRound(roundedTx.amount * factor);
          return { ...acc, balance: preciseAdd(acc.balance, delta) };
        }
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
    const roundedTx = { ...updatedTx, amount: preciseRound(updatedTx.amount) };
    const originalTx = transactions.find(t => t.id === roundedTx.id);
    if (!originalTx) return;

    setTransactions(prev => prev.map(t => t.id === roundedTx.id ? roundedTx : t));

    // Optimistic balance updates
    setAccounts(prev => prev.map(acc => {
      let bal = acc.balance;

      // Revert original
      if (originalTx.type === "transfer" && originalTx.toAccountId) {
        if (acc.id === originalTx.accountId) bal = preciseAdd(bal, originalTx.amount);
        if (acc.id === originalTx.toAccountId) bal = preciseSubtract(bal, originalTx.amount);
      } else {
        if (acc.id === originalTx.accountId) {
          const revertFactor = originalTx.type === "income" ? -1 : 1;
          const revertDelta = preciseRound(originalTx.amount * revertFactor);
          bal = preciseAdd(bal, revertDelta);
        }
      }

      // Apply new
      if (roundedTx.type === "transfer" && roundedTx.toAccountId) {
        if (acc.id === roundedTx.accountId) bal = preciseSubtract(bal, roundedTx.amount);
        if (acc.id === roundedTx.toAccountId) bal = preciseAdd(bal, roundedTx.amount);
      } else {
        if (acc.id === roundedTx.accountId) {
          const applyFactor = roundedTx.type === "income" ? 1 : -1;
          const applyDelta = preciseRound(roundedTx.amount * applyFactor);
          bal = preciseAdd(bal, applyDelta);
        }
      }
      
      return { ...acc, balance: preciseRound(bal) };
    }));

    try {
      await dbEditTransaction(roundedTx, originalTx.amount, originalTx.type, originalTx.accountId, originalTx.toAccountId);
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
      if (originalTx.type === "transfer" && originalTx.toAccountId) {
        if (acc.id === originalTx.accountId) return { ...acc, balance: preciseAdd(acc.balance, originalTx.amount) };
        if (acc.id === originalTx.toAccountId) return { ...acc, balance: preciseSubtract(acc.balance, originalTx.amount) };
      } else {
        if (acc.id === originalTx.accountId) {
          const factor = originalTx.type === "income" ? -1 : 1;
          const delta = preciseRound(originalTx.amount * factor);
          return { ...acc, balance: preciseAdd(acc.balance, delta) };
        }
      }
      return acc;
    }));

    try {
      await dbDeleteTransaction(id, originalTx.amount, originalTx.type, originalTx.accountId, originalTx.toAccountId);
    } catch (e) {
      console.error(e);
      await fetchAllData();
    }
  };

  const transferFunds = async (fromAccountId: string, toAccountId: string, amount: number): Promise<boolean> => {
    const fromAcc = accounts.find(a => a.id === fromAccountId);
    const toAcc = accounts.find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc || amount <= 0) return false;

    if (fromAcc.type !== "credit" && fromAcc.type !== "loan" && fromAcc.balance < amount) return false;

    const roundedAmount = preciseRound(amount);
    const dateStr = new Date().toISOString().split("T")[0];
    
    const tx: Omit<Transaction, "id"> = {
      title: `Transfer to ${toAcc.name}`,
      amount: roundedAmount,
      type: "transfer",
      category: "Transfer",
      accountId: fromAccountId,
      toAccountId: toAccountId,
      date: dateStr,
      notes: `Internal transfer`
    };

    // Use optimistic addTransaction directly
    await addTransaction(tx);
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
        const txDate = parseLocalDate(tx.date);
        const diffDays = Math.abs(getCalendarDaysDifference(today, txDate));
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
      if (filters.sortBy === "date-asc") return a.date.localeCompare(b.date);
      if (filters.sortBy === "amount-desc") return b.amount - a.amount;
      if (filters.sortBy === "amount-asc") return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });
    return result;
  };

  const resetData = async () => {
    await fetchAllData();
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions, accounts, budgets, filters, setFilters,
        addTransaction, editTransaction, deleteTransaction, transferFunds,
        addAccount, editAccount, deleteAccount, setPrimaryAccount, getFilteredTransactions, resetData, isLoading
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
