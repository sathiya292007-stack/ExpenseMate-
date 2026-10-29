import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.type !== undefined) {
      if (!["income", "expense"].includes(body.type)) {
        return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
      }
      data.type = body.type;
    }
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      data.amount = amt;
    }
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.date !== undefined) data.date = new Date(body.date);

    const transaction = await db.transaction.update({ where: { id }, data });
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
