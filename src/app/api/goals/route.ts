import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const goals = await db.savingsGoal.findMany({
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ goals });
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, targetAmount, savedAmount, targetDate } = body;

    const target = Number(targetAmount);
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: "targetAmount must be a positive number" }, { status: 400 });
    }

    const goal = await db.savingsGoal.create({
      data: {
        name: String(name).trim(),
        targetAmount: target,
        savedAmount: Number.isFinite(Number(savedAmount)) && Number(savedAmount) > 0 ? Number(savedAmount) : 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        completed: false,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
