import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [budgets, monthSpend] = await Promise.all([
      db.budget.findMany({ orderBy: { category: "asc" } }),
      db.transaction.groupBy({
        by: ["category"],
        where: { type: "expense", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);
    const spendMap = new Map(monthSpend.map((s) => [s.category, s._sum.amount ?? 0]));

    const budgetStatus = budgets.map((b) => {
      const spent = spendMap.get(b.category) ?? 0;
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return {
        ...b,
        spent: Math.round(spent),
        remaining: Math.round(b.limit - spent),
        pct,
        status: pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok",
      };
    });

    return NextResponse.json({ budgets: budgetStatus });
  } catch (error) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

/** Create or update a budget for a category (upsert by category). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, limit } = body;
    const lim = Number(limit);
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    if (!Number.isFinite(lim) || lim <= 0) {
      return NextResponse.json({ error: "limit must be a positive number" }, { status: 400 });
    }

    const budget = await db.budget.upsert({
      where: { category },
      update: { limit: lim },
      create: { category, limit: lim },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("POST /api/budgets error:", error);
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await db.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/budgets error:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
