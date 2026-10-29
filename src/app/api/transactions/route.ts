import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 1000) : undefined;

    const where: Record<string, unknown> = {};
    if (type === "income" || type === "expense") where.type = type;
    if (category) where.category = category;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (where.date as Record<string, unknown>).lte = toDate;
      }
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, amount, category, description, paymentMethod, date, source } = body;

    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: amt,
        category,
        description: description ? String(description).trim() : "",
        paymentMethod: paymentMethod || "cash",
        date: date ? new Date(date) : new Date(),
        source: source === "voice" ? "voice" : "manual",
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
