"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

import type { Transaction, Account, Budget } from "../context/FinanceContext";
import { preciseRound } from "../utils/math";

export async function getAccounts(): Promise<Account[]> {
  const { rows } = await sql`
    SELECT id, name, type, balance::float as balance, color 
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
  const { rows } = await sql`
    INSERT INTO accounts (name, type, balance, color)
    VALUES (${acc.name}, ${acc.type}, ${roundedBalance}, ${acc.color})
    RETURNING id
  `;
  revalidatePath("/");
  return rows[0].id;
}

export async function editAccount(acc: Account) {
  const roundedBalance = preciseRound(acc.balance);
  await sql`
    UPDATE accounts
    SET name = ${acc.name}, type = ${acc.type}, balance = ${roundedBalance}, color = ${acc.color}
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
  const { rows } = await sql`
    INSERT INTO transactions (title, amount, type, category, account_id, date, notes)
    VALUES (${tx.title}, ${roundedAmount}, ${tx.type}, ${tx.category}, ${tx.accountId}, ${tx.date}, ${tx.notes})
    RETURNING id
  `;
  
  const factor = tx.type === "income" ? 1 : -1;
  const delta = preciseRound(roundedAmount * factor);
  await sql`
    UPDATE accounts
    SET balance = balance + ${delta}
    WHERE id = ${tx.accountId}
  `;

  revalidatePath("/");
  return rows[0].id;
}

export async function editTransaction(tx: Transaction, originalAmount: number, originalType: string, originalAccountId: string) {
  const roundedOriginalAmount = preciseRound(originalAmount);
  const revertFactor = originalType === "income" ? -1 : 1;
  const revertDelta = preciseRound(roundedOriginalAmount * revertFactor);
  await sql`
    UPDATE accounts
    SET balance = balance + ${revertDelta}
    WHERE id = ${originalAccountId}
  `;

  const roundedAmount = preciseRound(tx.amount);
  await sql`
    UPDATE transactions
    SET title = ${tx.title}, amount = ${roundedAmount}, type = ${tx.type}, category = ${tx.category}, account_id = ${tx.accountId}, date = ${tx.date}, notes = ${tx.notes}
    WHERE id = ${tx.id}
  `;

  const applyFactor = tx.type === "income" ? 1 : -1;
  const applyDelta = preciseRound(roundedAmount * applyFactor);
  await sql`
    UPDATE accounts
    SET balance = balance + ${applyDelta}
    WHERE id = ${tx.accountId}
  `;

  revalidatePath("/");
}

export async function deleteTransaction(id: string, amount: number, type: string, accountId: string) {
  await sql`DELETE FROM transactions WHERE id = ${id}`;

  const roundedAmount = preciseRound(amount);
  const revertFactor = type === "income" ? -1 : 1;
  const revertDelta = preciseRound(roundedAmount * revertFactor);
  await sql`
    UPDATE accounts
    SET balance = balance + ${revertDelta}
    WHERE id = ${accountId}
  `;

  revalidatePath("/");
}

export async function transferFunds(fromAccountId: string, toAccountId: string, amount: number, transferOutTx: Omit<Transaction, "id">, transferInTx: Omit<Transaction, "id">) {
  const roundedAmount = preciseRound(amount);
  const roundedOutAmount = preciseRound(transferOutTx.amount);
  const roundedInAmount = preciseRound(transferInTx.amount);

  await sql`UPDATE accounts SET balance = balance - ${roundedAmount} WHERE id = ${fromAccountId}`;
  await sql`UPDATE accounts SET balance = balance + ${roundedAmount} WHERE id = ${toAccountId}`;

  await sql`
    INSERT INTO transactions (title, amount, type, category, account_id, date, notes)
    VALUES (${transferOutTx.title}, ${roundedOutAmount}, ${transferOutTx.type}, ${transferOutTx.category}, ${transferOutTx.accountId}, ${transferOutTx.date}, ${transferOutTx.notes})
  `;

  await sql`
    INSERT INTO transactions (title, amount, type, category, account_id, date, notes)
    VALUES (${transferInTx.title}, ${roundedInAmount}, ${transferInTx.type}, ${transferInTx.category}, ${transferInTx.accountId}, ${transferInTx.date}, ${transferInTx.notes})
  `;

  revalidatePath("/");
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
