import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
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

    return NextResponse.json({ message: "Database initialized successfully" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
