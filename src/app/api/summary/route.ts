import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "this_month";
    const now = new Date();

    // ---- resolve period range (for category breakdown) ----
    let rangeFrom: Date;
    let rangeTo: Date;
    if (period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeFrom = startOfMonth(lm);
      rangeTo = endOfMonth(lm);
    } else if (period === "last_30d") {
      rangeFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      rangeTo = now;
    } else if (period === "all") {
      rangeFrom = new Date(2000, 0, 1);
      rangeTo = now;
    } else {
      // this_month
      rangeFrom = startOfMonth(now);
      rangeTo = endOfMonth(now);
    }

    const [
      allAgg,
      monthIncome,
      monthExpense,
      recent7tx,
      last6MonthsTx,
      periodCategories,
      budgets,
      recent,
      prevMonthExpense,
    ] = await Promise.all([
      // all-time totals
      db.transaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
      }),
      // this month income
      db.transaction.aggregate({
        where: { type: "income", date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
      // this month expense
      db.transaction.aggregate({
        where: { type: "expense", date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
      // last 7 days transactions (aggregated in JS)
      db.transaction.findMany({
        where: {
          date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0) },
        },
        select: { type: true, amount: true, date: true },
      }),
      // last 6 months transactions (aggregated in JS)
      db.transaction.findMany({
        where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { type: true, amount: true, date: true },
      }),
      // category breakdown in selected period
      db.transaction.groupBy({
        by: ["category"],
        where: { type: "expense", date: { gte: rangeFrom, lte: rangeTo } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      // budgets
      db.budget.findMany({ orderBy: { category: "asc" } }),
      // recent 8 transactions
      db.transaction.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      // previous month expense (for month-over-month delta)
      db.transaction.aggregate({
        where: {
          type: "expense",
          date: {
            gte: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            lte: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = allAgg.find((a) => a.type === "income")?._sum.amount ?? 0;
    const totalExpense = allAgg.find((a) => a.type === "expense")?._sum.amount ?? 0;

    // ---- build last 7 days series (fill missing days with 0) ----
    const daily: Array<{ day: string; label: string; expense: number; income: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      daily.push({
        day: dayKey(d),
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        expense: 0,
        income: 0,
      });
    }
    for (const tx of recent7tx) {
      const entry = daily.find((d) => d.day === dayKey(new Date(tx.date)));
      if (entry) {
        if (tx.type === "expense") entry.expense += Math.round(tx.amount);
        else entry.income += Math.round(tx.amount);
      }
    }

    // ---- build last 6 months series ----
    const months: Array<{ month: string; label: string; income: number; expense: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: key,
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    for (const tx of last6MonthsTx) {
      const dt = new Date(tx.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const entry = months.find((m) => m.month === key);
      if (entry) {
        if (tx.type === "income") entry.income += Math.round(tx.amount);
        else entry.expense += Math.round(tx.amount);
      }
    }

    // ---- budget status (spent this month per budgeted category) ----
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthSpendByCat = await db.transaction.groupBy({
      by: ["category"],
      where: { type: "expense", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });
    const spendMap = new Map(monthSpendByCat.map((s) => [s.category, s._sum.amount ?? 0]));

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

    // ---- budget suggestions for categories WITHOUT a budget ----
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const unbudgeted = await db.transaction.groupBy({
      by: ["category"],
      where: {
        type: "expense",
        date: { gte: threeMonthsAgo },
        category: { notIn: budgets.map((b) => b.category) },
      },
      _sum: { amount: true },
    });
    const suggestions = unbudgeted.map((u) => {
      const avg = (u._sum.amount ?? 0) / 3;
      return { category: u.category, suggested: Math.max(50, Math.round((avg * 1.1) / 50) * 50) };
    });

    const monthExpenseTotal = monthExpense._sum.amount ?? 0;
    const prevExpenseTotal = prevMonthExpense._sum.amount ?? 0;

    return NextResponse.json({
      totals: {
        income: Math.round(totalIncome),
        expense: Math.round(totalExpense),
        balance: Math.round(totalIncome - totalExpense),
      },
      thisMonth: {
        income: Math.round(monthIncome._sum.amount ?? 0),
        expense: Math.round(monthExpenseTotal),
        prevExpense: Math.round(prevExpenseTotal),
        savingsRate:
          (monthIncome._sum.amount ?? 0) > 0
            ? Math.round((((monthIncome._sum.amount ?? 0) - monthExpenseTotal) / (monthIncome._sum.amount ?? 0)) * 100)
            : 0,
      },
      daily,
      months,
      periodCategories: periodCategories.map((c) => ({
        category: c.category,
        amount: Math.round(c._sum.amount ?? 0),
      })),
      budgetStatus,
      suggestions,
      recent,
      period: { from: rangeFrom.toISOString(), to: rangeTo.toISOString(), key: period },
    });
  } catch (error) {
    console.error("GET /api/summary error:", error);
    return NextResponse.json({ error: "Failed to build summary" }, { status: 500 });
  }
}
