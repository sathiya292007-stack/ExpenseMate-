import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const EXPENSE_CATS = ["Food", "Transport", "Refreshment", "Academic", "Shopping", "Bills", "Health", "Entertainment", "Other"];
const INCOME_CATS = ["Salary", "Pocket Money", "Part-time", "Scholarship", "Other Income"];

function buildSystemPrompt(todayStr: string): string {
  return `You are a precise expense-record extractor for a personal finance app. The user gives you text (usually a speech transcript, possibly messy) describing money they spent or received. Currency is Indian Rupees (INR).

Expense categories (use EXACTLY one of): ${EXPENSE_CATS.join(", ")}
- Food: meals, lunch, dinner, canteen, groceries, mess food
- Transport: bus, auto, train, cab, fuel, bus pass
- Refreshment: tea, coffee, snacks, juice, ice cream
- Academic: xerox, photocopy, books, notebooks, stationery, materials, fees, printing
- Shopping: clothes, sandals, personal items, cosmetics
- Bills: mobile recharge, electricity, internet, rent, water
- Health: medicine, doctor, hospital
- Entertainment: movie, games, outings, trips
- Other: anything else

Income categories (use EXACTLY one of): ${INCOME_CATS.join(", ")}
- Salary, Pocket Money, Part-time, Scholarship, Other Income (money received, got, credited, earned)

Extraction rules:
1. Extract EVERY distinct money record mentioned. One sentence may contain multiple records.
2. amount: positive number in rupees. Handle spoken forms like "fifty rupees" (50), "one twenty" (~120), "hundred and fifty" (150). If words fail, estimate from context and round sensibly.
3. date: "YYYY-MM-DD". Today is ${todayStr}. Use yesterday's date if the user says "yesterday". Otherwise use today's date.
4. type: "expense" if money went out (spent, bought, paid, gave); "income" if money came in (got, received, credited, earned, mom sent).
5. description: short natural phrase, e.g. "xerox of notes", "bus fare to college", "tea and samosa".
6. paymentMethod: "upi" if gpay/phonepe/paytm/upi mentioned, "card" if card mentioned, "bank" if bank/transfer/netbanking mentioned, otherwise "cash".
7. If an item has no amount at all, SKIP it. Never invent amounts from nothing, but DO convert number words to digits when present.
8. If the transcript contains no money records at all, return [].

Respond with ONLY a valid JSON array (no markdown, no explanation). Each element:
{"type":"expense","amount":50,"category":"Academic","description":"xerox of notes","date":"${todayStr}","paymentMethod":"cash"}`;
}

interface ParsedTx {
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
}

function extractJsonArray(text: string): ParsedTx[] {
  if (!text) return [];
  let cleaned = text.trim();
  // strip markdown code fences if present
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
  // find the outermost JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr as ParsedTx[];
  } catch {
    return [];
  }
}

function sanitizeParsed(raw: ParsedTx[], today: Date): ParsedTx[] {
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const out: ParsedTx[] = [];
  for (const item of raw) {
    const type = item?.type === "income" ? "income" : item?.type === "expense" ? "expense" : null;
    const amount = Number(item?.amount);
    if (!type || !Number.isFinite(amount) || amount <= 0) continue;
    let category = String(item?.category ?? "Other");
    const validCats = type === "expense" ? EXPENSE_CATS : INCOME_CATS;
    const match = validCats.find((c) => c.toLowerCase() === category.toLowerCase());
    category = match ?? (type === "expense" ? "Other" : "Other Income");
    let date = String(item?.date ?? todayStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayStr;
    if (date > todayStr) date = todayStr;
    if (date < yesterdayStr.slice(0, 4) + "-01-01") date = todayStr;
    out.push({
      type,
      amount: Math.round(amount * 100) / 100,
      category,
      description: String(item?.description ?? "").slice(0, 120),
      date,
      paymentMethod: ["cash", "upi", "card", "bank"].includes(item?.paymentMethod) ? item.paymentMethod : "cash",
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audioBase64: string | undefined = body.audio;
    const text: string | undefined = body.text;

    if (!audioBase64 && !text) {
      return NextResponse.json({ error: "Provide either audio (base64) or text" }, { status: 400 });
    }

    let transcript = "";

    if (audioBase64) {
      const zai = await ZAI.create();
      try {
        const asrResponse = await zai.audio.asr.create({ file_base64: audioBase64 });
        transcript = (asrResponse?.text ?? "").trim();
      } catch (asrError) {
        console.error("ASR error:", asrError);
        return NextResponse.json(
          { error: "Could not understand the audio. Try speaking clearly or use text entry." },
          { status: 422 }
        );
      }
      if (!transcript) {
        return NextResponse.json(
          { error: "No speech detected in the audio. Try again or type it instead." },
          { status: 422 }
        );
      }
    } else {
      transcript = String(text).trim();
      if (!transcript) {
        return NextResponse.json({ error: "Text is empty" }, { status: 400 });
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // LLM extraction with retry
    const zai2 = await ZAI.create();
    let parsed: ParsedTx[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await zai2.chat.completions.create({
          messages: [
            { role: "assistant", content: buildSystemPrompt(todayStr) },
            {
              role: "user",
              content: `Today is ${todayStr}. Extract the money records from this text:\n\n"${transcript}"`,
            },
          ],
          thinking: { type: "disabled" },
        });
        const content = completion.choices[0]?.message?.content ?? "";
        parsed = sanitizeParsed(extractJsonArray(content), now);
        if (parsed.length > 0) break;
      } catch (llmError) {
        console.error(`LLM parse attempt ${attempt} failed:`, llmError);
      }
    }

    return NextResponse.json({ transcript, parsed });
  } catch (error) {
    console.error("POST /api/voice/parse error:", error);
    return NextResponse.json({ error: "Failed to parse. Please try again." }, { status: 500 });
  }
}
