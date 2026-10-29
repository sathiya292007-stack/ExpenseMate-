import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function POST() {
  try {
    const count = await db.transaction.count();
    if (count > 0) {
      return NextResponse.json({ error: "Database already has data. Clear it first." }, { status: 400 });
    }

    const txData: Array<{
      type: string;
      amount: number;
      category: string;
      description: string;
      paymentMethod: string;
      date: Date;
      source: string;
    }> = [];

    // --- Income ---
    txData.push({ type: "income", amount: 4000, category: "Pocket Money", description: "Monthly pocket money from home", paymentMethod: "bank", date: daysAgo(27, 9), source: "manual" });
    txData.push({ type: "income", amount: 2500, category: "Part-time", description: "Weekend tuition class payment", paymentMethod: "upi", date: daysAgo(18, 19), source: "manual" });
    txData.push({ type: "income", amount: 500, category: "Other Income", description: "Sold old textbooks", paymentMethod: "cash", date: daysAgo(10, 16), source: "manual" });
    txData.push({ type: "income", amount: 3000, category: "Pocket Money", description: "Festival money from parents", paymentMethod: "upi", date: daysAgo(5, 10), source: "manual" });
    // last month income for the 6-month chart
    txData.push({ type: "income", amount: 4000, category: "Pocket Money", description: "Monthly pocket money", paymentMethod: "bank", date: daysAgo(38, 9), source: "manual" });

    // --- Food ---
    const foodItems: Array<[number, number, string, string]> = [
      [26, 120, "Lunch at college canteen", "cash"],
      [24, 85, "Dinner - biryani with friends", "upi"],
      [22, 60, "Groceries - rice and dal", "cash"],
      [20, 95, "Lunch meals x3", "upi"],
      [17, 140, "Weekend dinner out", "upi"],
      [15, 70, "Vegetables and fruits", "cash"],
      [12, 110, "Canteen meals", "upi"],
      [9, 90, "Dinner from mess missing menu", "cash"],
      [6, 125, "Chicken fried rice", "upi"],
      [3, 65, "Milk, eggs and bread", "upi"],
      [1, 80, "Lunch at canteen", "cash"],
    ];
    for (const [d, amt, desc, pm] of foodItems) {
      txData.push({ type: "expense", amount: amt, category: "Food", description: desc, paymentMethod: pm, date: daysAgo(d, 13), source: "manual" });
    }

    // --- Transport ---
    const transportItems: Array<[number, number, string, string]> = [
      [25, 30, "Bus fare to college", "cash"],
      [21, 45, "Auto to railway station", "cash"],
      [18, 30, "Bus fare", "cash"],
      [14, 60, "Shared auto both ways", "upi"],
      [11, 30, "Bus fare", "cash"],
      [7, 25, "Auto fare", "cash"],
      [4, 30, "Bus fare to college", "cash"],
      [0, 30, "Bus fare", "cash"],
    ];
    for (const [d, amt, desc, pm] of transportItems) {
      txData.push({ type: "expense", amount: amt, category: "Transport", description: desc, paymentMethod: pm, date: daysAgo(d, 8), source: "manual" });
    }

    // --- Refreshment ---
    const refreshItems: Array<[number, number, string, string]> = [
      [26, 15, "Morning tea", "cash"],
      [23, 40, "Tea and samosa", "cash"],
      [19, 50, "Coffee with friends", "upi"],
      [16, 20, "Tea and biscuits", "cash"],
      [13, 35, "Juice after class", "upi"],
      [10, 25, "Tea x2", "cash"],
      [8, 45, "Ice cream", "upi"],
      [5, 20, "Morning tea", "cash"],
      [2, 50, "Cold coffee", "upi"],
      [0, 15, "Tea", "cash"],
    ];
    for (const [d, amt, desc, pm] of refreshItems) {
      txData.push({ type: "expense", amount: amt, category: "Refreshment", description: desc, paymentMethod: pm, date: daysAgo(d, 16), source: "manual" });
    }

    // --- Academic ---
    txData.push({ type: "expense", amount: 120, category: "Academic", description: "Xerox of class notes", paymentMethod: "cash", date: daysAgo(24, 11), source: "manual" });
    txData.push({ type: "expense", amount: 350, category: "Academic", description: "Record notebook and observation book", paymentMethod: "upi", date: daysAgo(20, 17), source: "manual" });
    txData.push({ type: "expense", amount: 90, category: "Academic", description: "Xerox and spiral binding of assignments", paymentMethod: "cash", date: daysAgo(14, 11), source: "manual" });
    txData.push({ type: "expense", amount: 480, category: "Academic", description: "Reference book from shop", paymentMethod: "upi", date: daysAgo(8, 18), source: "manual" });
    txData.push({ type: "expense", amount: 60, category: "Academic", description: "Xerox before internals", paymentMethod: "cash", date: daysAgo(2, 11), source: "manual" });

    // --- Others ---
    txData.push({ type: "expense", amount: 299, category: "Bills", description: "Mobile recharge", paymentMethod: "upi", date: daysAgo(22, 20), source: "manual" });
    txData.push({ type: "expense", amount: 450, category: "Shopping", description: "Sandals", paymentMethod: "upi", date: daysAgo(16, 15), source: "manual" });
    txData.push({ type: "expense", amount: 150, category: "Entertainment", description: "Movie ticket with friends", paymentMethod: "upi", date: daysAgo(12, 19), source: "manual" });
    txData.push({ type: "expense", amount: 85, category: "Health", description: "Tablets for fever", paymentMethod: "cash", date: daysAgo(9, 10), source: "manual" });
    txData.push({ type: "expense", amount: 200, category: "Entertainment", description: "Outing - bowling", paymentMethod: "upi", date: daysAgo(4, 19), source: "manual" });
    // last month expenses for 6-month chart
    txData.push({ type: "expense", amount: 1650, category: "Food", description: "Mess food last month", paymentMethod: "cash", date: daysAgo(40, 13), source: "manual" });
    txData.push({ type: "expense", amount: 500, category: "Transport", description: "Monthly bus pass", paymentMethod: "cash", date: daysAgo(39, 8), source: "manual" });
    txData.push({ type: "expense", amount: 320, category: "Academic", description: "Lab manual and xerox", paymentMethod: "cash", date: daysAgo(36, 11), source: "manual" });

    // --- Budgets: Food over budget (warning), Refreshment near limit (warning), others ok ---
    await db.budget.createMany({
      data: [
        { category: "Food", limit: 800 },
        { category: "Refreshment", limit: 350 },
        { category: "Transport", limit: 400 },
        { category: "Academic", limit: 1200 },
        { category: "Bills", limit: 400 },
      ],
    });

    // --- Savings goals ---
    await db.savingsGoal.createMany({
      data: [
        { name: "New laptop for coding", targetAmount: 45000, savedAmount: 12000, targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)), completed: false },
        { name: "Bicycle for campus", targetAmount: 8000, savedAmount: 6500, targetDate: new Date(new Date().setMonth(new Date().getMonth() + 2)), completed: false },
        { name: "Emergency fund", targetAmount: 5000, savedAmount: 5000, targetDate: null, completed: true },
      ],
    });

    const result = await db.transaction.createMany({ data: txData });
    return NextResponse.json({ created: result.count }, { status: 201 });
  } catch (error) {
    console.error("POST /api/seed error:", error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.transaction.deleteMany({});
    await db.budget.deleteMany({});
    await db.savingsGoal.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/seed error:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
