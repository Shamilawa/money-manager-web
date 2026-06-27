import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { sql } from '@vercel/postgres';
import { getTransactions } from '@/app/actions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Need to configure this so cron knows who to message
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
}

export async function GET(request: Request) {
  // Simple cron security check
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch Agent Memory (Rules set by user)
    const { rows: memoryRows } = await sql`SELECT content FROM agent_memory`;
    const memoryRules = memoryRows.map(r => r.content).join('\n- ');

    // 2. Fetch Recent Transactions (Limit to last 50 for cost/context reasons)
    const transactions = await getTransactions();
    const recentTx = transactions.slice(0, 50);
    const txContext = recentTx.map(tx => 
      `Date: ${tx.date}, Title: ${tx.title}, Amount: $${tx.amount}, Category: ${tx.category}, Type: ${tx.type}`
    ).join('\n');

    // 3. Construct the prompt
    const systemPrompt = `
You are a proactive Financial Assistant. Your job is to analyze the user's recent transactions and identify patterns, recurring expenses, or significant behavioral shifts.
You run in the background (as a cron job) and should only message the user if you find a meaningful insight.

USER PREFERENCES AND RULES (Learned from past feedback):
- ${memoryRules || "No specific rules learned yet."}

RECENT TRANSACTIONS:
${txContext}

Task:
Analyze the transactions. Look for:
1. Subscriptions or recurring payments that happen on similar dates.
2. Spikes in spending in specific categories.
3. Unusually high single expenses.

If you find something worth bringing to the user's attention, generate a helpful, concise message to send them.
If you DO NOT find anything important, just output the exact word "NO_INSIGHT" and nothing else.
DO NOT suggest patterns that violate the User Preferences and Rules.
`;

    // 4. Evaluate with GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt }
      ],
    });

    const insight = completion.choices[0].message.content?.trim();

    // 5. Send Proactive Message if applicable
    if (insight && insight !== "NO_INSIGHT") {
      if (TELEGRAM_CHAT_ID) {
        await sendMessage(TELEGRAM_CHAT_ID, insight);
        return NextResponse.json({ ok: true, sent: true, insight });
      } else {
        console.warn("Found insight, but TELEGRAM_CHAT_ID is missing.");
        return NextResponse.json({ ok: true, sent: false, error: "Missing Chat ID" });
      }
    }

    return NextResponse.json({ ok: true, sent: false, message: "No insights found." });

  } catch (error) {
    console.error("Error running cron analysis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
