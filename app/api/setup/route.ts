import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Initial Tables
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        balance DECIMAL(12, 2) NOT NULL,
        color VARCHAR(20) NOT NULL
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        notes TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(100) UNIQUE NOT NULL,
        limit_amount DECIMAL(12, 2) NOT NULL
      );
    `;

    // 2. Safe Migrations for Debt Management & Transfers
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2);`;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2);`;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS minimum_payment DECIMAL(12, 2);`;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_date INTEGER;`;
    
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;`;

    return NextResponse.json({ message: "Database initialized and migrated successfully" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
