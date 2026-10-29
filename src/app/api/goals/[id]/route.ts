import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const goal = await db.savingsGoal.findUnique({ where: { id } });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    // contribute mode: { add: number }
    if (body.add !== undefined) {
      const add = Number(body.add);
      if (!Number.isFinite(add) || add === 0) {
        return NextResponse.json({ error: "add must be a non-zero number" }, { status: 400 });
      }
      const newSaved = Math.max(0, goal.savedAmount + add);
      data.savedAmount = newSaved;
      data.completed = newSaved >= goal.targetAmount;
    } else {
      if (body.name !== undefined) data.name = String(body.name).trim();
      if (body.targetAmount !== undefined) {
        const t = Number(body.targetAmount);
        if (!Number.isFinite(t) || t <= 0) {
          return NextResponse.json({ error: "targetAmount must be positive" }, { status: 400 });
        }
        data.targetAmount = t;
      }
      if (body.savedAmount !== undefined) {
        const s = Number(body.savedAmount);
        if (!Number.isFinite(s) || s < 0) {
          return NextResponse.json({ error: "savedAmount must be >= 0" }, { status: 400 });
        }
        data.savedAmount = s;
      }
      if (body.targetDate !== undefined) {
        data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
      }
      if (body.completed !== undefined) data.completed = Boolean(body.completed);
    }

    const updated = await db.savingsGoal.update({ where: { id }, data });
    return NextResponse.json({ goal: updated });
  } catch (error) {
    console.error("PATCH /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.savingsGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
