import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAccounts, addTransaction } from '@/app/actions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userMessage = update.message.text;

      const { sql } = await import('@vercel/postgres');

      // 1. Fetch available accounts to give context to the AI
      const accounts = await getAccounts();
      const accountsContext = accounts.map(a => `- ${a.name} (ID: ${a.id}, Balance: $${a.balance})`).join('\n');

      // Fetch Agent Memory for other rules
      const { rows: memoryRows } = await sql`SELECT content FROM agent_memory`;
      const memoryRules = memoryRows.map(r => r.content).join('\n- ');

      const primaryAccount = accounts.find(a => a.isPrimary);
      const primaryInstruction = primaryAccount 
        ? `The user's explicitly set PRIMARY account is: ${primaryAccount.name} (ID: ${primaryAccount.id}). If they do not specify an account in their message, you MUST use this account ID.` 
        : `No primary account is set. If the user does not specify an account in their message, you must ask them which account they want to use before logging the transaction.`;

      const systemPrompt = `
You are a helpful Financial Assistant.
The current date is ${new Date().toISOString().split('T')[0]}.
The currency used is LKR (Sri Lankan Rupees).

You help the user manage their finances by logging transactions and providing insights.
Here are the user's current accounts:
${accountsContext}

${primaryInstruction}

USER PREFERENCES AND RULES:
- ${memoryRules || "No preferences set yet."}

WORKFLOW FOR LOGGING TRANSACTIONS:
1. Automatically infer the amount, category, and intent (expense vs income) from the user's message.
2. If any required info is missing (like category or amount), ask the user for it.
3. ONCE YOU HAVE ALL INFO (amount, category, type, and account), you MUST summarize it and ask the user to confirm before logging. For example: "Got it! You want to log an expense of 2000 LKR for Food in the Primary Account. Shall I go ahead and save this?"
4. ONLY call the 'log_transaction' tool AFTER the user explicitly says "yes" or confirms the summary. DO NOT call 'log_transaction' before the user confirms.

Be friendly and concise in your responses.
`;

      // Fetch chat history for this user
      const { rows: historyRows } = await sql`
        SELECT role, content FROM (
          SELECT role, content, created_at FROM agent_chat_history
          WHERE chat_id = ${chatId}
          ORDER BY created_at DESC
          LIMIT 15
        ) sub
        ORDER BY created_at ASC
      `;
      
      const pastMessages = historyRows.map(row => ({
        role: row.role as any,
        content: row.content,
      }));

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...pastMessages,
        { role: "user", content: userMessage }
      ];

      // Save user message to history
      await sql`
        INSERT INTO agent_chat_history (chat_id, role, content)
        VALUES (${chatId}, 'user', ${userMessage})
      `;

      const tools: OpenAI.Chat.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "log_transaction",
            description: "Log a new transaction (expense or income) into the database. ONLY CALL THIS AFTER USER CONFIRMS.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short description of the transaction." },
                amount: { type: "number", description: "Amount of the transaction (positive number)." },
                type: { type: "string", enum: ["expense", "income"] },
                category: { type: "string", description: "Category of the expense (e.g., Food, Transport, Rent)." },
                accountId: { type: "string", description: "The ID of the account to use for the transaction." },
              },
              required: ["title", "amount", "type", "category", "accountId"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "update_agent_memory",
            description: "Learn a new rule or preference about the user based on their feedback.",
            parameters: {
              type: "object",
              properties: {
                rule_type: { type: "string", description: "Category of the rule (e.g., 'preference', 'ignore', 'recurring_pattern')." },
                content: { type: "string", description: "The specific rule to remember (e.g., 'User does not want to track coffee expenses')." }
              },
              required: ["rule_type", "content"],
            },
          },
        }
      ];

      // 2. Call OpenAI with tools
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto"
      });

      const responseMessage = completion.choices[0].message;

      // Save assistant message to history if no tool was called
      if (responseMessage.content && (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0)) {
        await sql`
          INSERT INTO agent_chat_history (chat_id, role, content)
          VALUES (${chatId}, 'assistant', ${responseMessage.content})
        `;
      }

      // 3. Handle Tool Calls if the AI decided to use one
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === "function" && toolCall.function.name === "log_transaction") {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Execute the action to write to Vercel Postgres
            await addTransaction({
              title: args.title,
              amount: args.amount,
              type: args.type,
              category: args.category,
              accountId: args.accountId,
              date: new Date().toISOString().split('T')[0],
              notes: "Logged via Telegram Bot",
            });

            // We can ask OpenAI to generate a final response now that the tool succeeded
            messages.push(responseMessage);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: true, message: "Transaction saved successfully." })
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
            });

            const finalContent = finalCompletion.choices[0].message.content || "Logged successfully!";
            
            // Save final assistant message to history
            await sql`
              INSERT INTO agent_chat_history (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${finalContent})
            `;

            await sendMessage(chatId, finalContent);
          } else if (toolCall.type === "function" && toolCall.function.name === "update_agent_memory") {
            const args = JSON.parse(toolCall.function.arguments);
            
            await sql`
              INSERT INTO agent_memory (rule_type, content)
              VALUES (${args.rule_type}, ${args.content})
            `;

            messages.push(responseMessage);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: true, message: "Memory updated successfully." })
            });

            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages,
            });

            const finalContent = finalCompletion.choices[0].message.content || "Got it! I've updated my memory.";
            
            // Save final assistant message to history
            await sql`
              INSERT INTO agent_chat_history (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${finalContent})
            `;

            await sendMessage(chatId, finalContent);
          }
        }
      } else {
        // If no tool was called, just send the text response
        await sendMessage(chatId, responseMessage.content || "I couldn't process that.");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing telegram webhook:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to prevent retries
  }
}
