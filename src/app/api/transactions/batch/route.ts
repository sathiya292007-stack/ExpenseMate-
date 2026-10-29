import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Batch-create transactions (used by voice import to save multiple parsed items). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.transactions) ? body.transactions : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: "Too many transactions (max 50)" }, { status: 400 });
    }

    const valid = [];
    for (const item of items) {
      const { type, amount, category, description, paymentMethod, date } = item;
      if (!type || !["income", "expense"].includes(type)) continue;
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      if (!category) continue;
      valid.push({
        type,
        amount: amt,
        category,
        description: description ? String(description).trim() : "",
        paymentMethod: paymentMethod || "cash",
        date: date ? new Date(date) : new Date(),
        source: "voice",
      });
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid transactions to save" }, { status: 400 });
    }

    const result = await db.transaction.createMany({ data: valid });
    return NextResponse.json({ created: result.count }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions/batch error:", error);
    return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });
  }
}
