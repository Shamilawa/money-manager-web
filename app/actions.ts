"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

import type { Transaction, Account, Budget } from "../context/FinanceContext";
import { preciseRound } from "../utils/math";

export async function getAccounts(): Promise<Account[]> {
  const { rows } = await sql`
    SELECT id, name, type, balance::float as balance, color,
           interest_rate::float as "interestRate",
           credit_limit::float as "creditLimit",
           minimum_payment::float as "minimumPayment",
           due_date as "dueDate"
    FROM accounts 
    ORDER BY name ASC
  `;
  return rows as Account[];
}

export async function getTransactions(): Promise<Transaction[]> {
  const { rows } = await sql`
    SELECT 
      id, 
      title, 
      amount::float as amount, 
      type, 
      category, 
      account_id as "accountId", 
      to_account_id as "toAccountId",
      to_char(date, 'YYYY-MM-DD') as date, 
      notes 
    FROM transactions 
    ORDER BY date DESC
  `;
  return rows as Transaction[];
}

export async function getBudgets(): Promise<Budget[]> {
  const { rows } = await sql`SELECT category, limit_amount::float as limit FROM budgets`;
  return rows as Budget[];
}

export async function addAccount(acc: Omit<Account, "id">) {
  const roundedBalance = preciseRound(acc.balance);
  const ir = acc.interestRate ?? null;
  const cl = acc.creditLimit ?? null;
  const mp = acc.minimumPayment ?? null;
  const dd = acc.dueDate ?? null;

  const { rows } = await sql`
    INSERT INTO accounts (name, type, balance, color, interest_rate, credit_limit, minimum_payment, due_date)
    VALUES (${acc.name}, ${acc.type}, ${roundedBalance}, ${acc.color}, ${ir}, ${cl}, ${mp}, ${dd})
    RETURNING id
  `;
  revalidatePath("/");
  return rows[0].id;
}

export async function editAccount(acc: Account) {
  const roundedBalance = preciseRound(acc.balance);
  const ir = acc.interestRate ?? null;
  const cl = acc.creditLimit ?? null;
  const mp = acc.minimumPayment ?? null;
  const dd = acc.dueDate ?? null;

  await sql`
    UPDATE accounts
    SET name = ${acc.name}, type = ${acc.type}, balance = ${roundedBalance}, color = ${acc.color},
        interest_rate = ${ir}, credit_limit = ${cl}, minimum_payment = ${mp}, due_date = ${dd}
    WHERE id = ${acc.id}
  `;
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  await sql`DELETE FROM accounts WHERE id = ${id}`;
  revalidatePath("/");
}

export async function addTransaction(tx: Omit<Transaction, "id">) {
  const roundedAmount = preciseRound(tx.amount);
  const toAccId = tx.toAccountId ?? null;

  const { rows } = await sql`
    INSERT INTO transactions (title, amount, type, category, account_id, to_account_id, date, notes)
    VALUES (${tx.title}, ${roundedAmount}, ${tx.type}, ${tx.category}, ${tx.accountId}, ${toAccId}, ${tx.date}, ${tx.notes})
    RETURNING id
  `;
  
  if (tx.type === "transfer" && toAccId) {
    // Decrease from source account
    await sql`UPDATE accounts SET balance = balance - ${roundedAmount} WHERE id = ${tx.accountId}`;
    // Increase to destination account
    await sql`UPDATE accounts SET balance = balance + ${roundedAmount} WHERE id = ${toAccId}`;
  } else {
    const factor = tx.type === "income" ? 1 : -1;
    const delta = preciseRound(roundedAmount * factor);
    await sql`
      UPDATE accounts
      SET balance = balance + ${delta}
      WHERE id = ${tx.accountId}
    `;
  }

  revalidatePath("/");
  return rows[0].id;
}

export async function editTransaction(
  tx: Transaction, 
  originalAmount: number, 
  originalType: string, 
  originalAccountId: string,
  originalToAccountId?: string
) {
  const roundedOriginalAmount = preciseRound(originalAmount);
  
  // Revert original transaction impact
  if (originalType === "transfer" && originalToAccountId) {
    await sql`UPDATE accounts SET balance = balance + ${roundedOriginalAmount} WHERE id = ${originalAccountId}`;
    await sql`UPDATE accounts SET balance = balance - ${roundedOriginalAmount} WHERE id = ${originalToAccountId}`;
  } else {
    const revertFactor = originalType === "income" ? -1 : 1;
    const revertDelta = preciseRound(roundedOriginalAmount * revertFactor);
    await sql`UPDATE accounts SET balance = balance + ${revertDelta} WHERE id = ${originalAccountId}`;
  }

  // Apply new transaction impact
  const roundedAmount = preciseRound(tx.amount);
  const toAccId = tx.toAccountId ?? null;

  await sql`
    UPDATE transactions
    SET title = ${tx.title}, amount = ${roundedAmount}, type = ${tx.type}, category = ${tx.category}, account_id = ${tx.accountId}, to_account_id = ${toAccId}, date = ${tx.date}, notes = ${tx.notes}
    WHERE id = ${tx.id}
  `;

  if (tx.type === "transfer" && toAccId) {
    await sql`UPDATE accounts SET balance = balance - ${roundedAmount} WHERE id = ${tx.accountId}`;
    await sql`UPDATE accounts SET balance = balance + ${roundedAmount} WHERE id = ${toAccId}`;
  } else {
    const applyFactor = tx.type === "income" ? 1 : -1;
    const applyDelta = preciseRound(roundedAmount * applyFactor);
    await sql`UPDATE accounts SET balance = balance + ${applyDelta} WHERE id = ${tx.accountId}`;
  }

  revalidatePath("/");
}

export async function deleteTransaction(
  id: string, 
  amount: number, 
  type: string, 
  accountId: string,
  toAccountId?: string
) {
  await sql`DELETE FROM transactions WHERE id = ${id}`;

  const roundedAmount = preciseRound(amount);
  
  // Revert transaction impact
  if (type === "transfer" && toAccountId) {
    await sql`UPDATE accounts SET balance = balance + ${roundedAmount} WHERE id = ${accountId}`;
    await sql`UPDATE accounts SET balance = balance - ${roundedAmount} WHERE id = ${toAccountId}`;
  } else {
    const revertFactor = type === "income" ? -1 : 1;
    const revertDelta = preciseRound(roundedAmount * revertFactor);
    await sql`UPDATE accounts SET balance = balance + ${revertDelta} WHERE id = ${accountId}`;
  }

  revalidatePath("/");
}

export async function transferFunds(fromAccountId: string, toAccountId: string, amount: number, tx: Omit<Transaction, "id">) {
  // Legacy quick-transfer wrapper uses addTransaction now directly, but keeping it to avoid breaking component completely before we update it
  return addTransaction(tx);
}

export async function setupInitialBudgets(budgets: Budget[]) {
  for (const b of budgets) {
    await sql`
      INSERT INTO budgets (category, limit_amount)
      VALUES (${b.category}, ${b.limit})
      ON CONFLICT (category) DO NOTHING
    `;
  }
}
