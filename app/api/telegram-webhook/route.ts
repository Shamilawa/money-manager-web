import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
// Ensure you have OPENAI_API_KEY in your .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return;
  }
  
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Check if it's a message
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userMessage = update.message.text;

      // Basic GPT-4o processing for Phase 1
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful Financial Assistant. You are currently in Phase 1 of development. For now, you just acknowledge what the user tells you about their expenses and give basic, educational advice. You cannot actually save to the database yet." 
          },
          { role: "user", content: userMessage }
        ],
      });

      const responseText = completion.choices[0].message.content || "Sorry, I couldn't process that.";
      
      await sendMessage(chatId, responseText);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing telegram webhook:", error);
    // Always return 200 to Telegram so it doesn't retry indefinitely
    return NextResponse.json({ ok: true });
  }
}
