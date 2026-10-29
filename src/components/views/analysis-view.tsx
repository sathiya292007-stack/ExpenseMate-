"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/client-api";
import { EXPENSE_CATEGORIES, formatINR, getCategory } from "@/lib/constants";
import type { SummaryData } from "@/lib/types";
import { BudgetsSection } from "@/components/views/budgets-section";
import { GoalsSection } from "@/components/views/goals-section";
import { TransactionsSection } from "@/components/views/transactions-section";
import { PieChart as PieIcon, ChartColumn, Target, ReceiptText, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

const PERIODS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_30d", label: "Last 30 Days" },
  { key: "all", label: "All Time" },
];

export function AnalysisView({ refreshKey, onChanged }: Props) {
  const [period, setPeriod] = useState("this_month");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<SummaryData>(`/api/summary?period=${period}`);
      setSummary(data);
    } catch {
      // keep old
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const pieData = useMemo(() => {
    const cats = summary?.periodCategories ?? [];
    return cats.map((c) => ({
      name: c.category,
      value: c.amount,
      color: getCategory(c.category).color,
    }));
  }, [summary]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const maxCat = pieData.reduce((max, d) => (d.value > max.value ? d : max), { name: "", value: 0, color: "#78716c" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Analysis & budgets</h1>
          <p className="text-sm text-muted-foreground">Charts, budget limits with warnings, and savings goals.</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-9">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="px-3 text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="charts">
        <TabsList className="grid h-10 w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="charts" className="gap-1.5 text-xs md:text-sm">
            <PieIcon className="h-3.5 w-3.5" /> Charts
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-1.5 text-xs md:text-sm">
            <Target className="h-3.5 w-3.5" /> Budgets
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5 text-xs md:text-sm">
            <Wallet className="h-3.5 w-3.5" /> Goals
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5 text-xs md:text-sm">
            <ReceiptText className="h-3.5 w-3.5" /> List
          </TabsTrigger>
        </TabsList>

        {/* ---------- CHARTS ---------- */}
        <TabsContent value="charts" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* pie */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <PieIcon className="h-4 w-4 text-emerald-600" /> Expense by category
                </CardTitle>
                <span className="text-xs text-muted-foreground">{PERIODS.find((p) => p.key === period)?.label}</span>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : pieData.length === 0 ? (
                  <div className="flex h-72 flex-col items-center justify-center gap-2 text-center">
                    <ChartColumn className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No expenses in this period.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="55%"
                            outerRadius="85%"
                            paddingAngle={2}
                            strokeWidth={2}
                          >
                            {pieData.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [formatINR(Number(value)), String(name)]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs text-muted-foreground">Total spent</span>
                        <span className="text-xl font-bold tabular-nums">{formatINR(pieTotal)}</span>
                      </div>
                    </div>
                    {/* legend */}
                    <div className="mt-3 space-y-1.5">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                          <span className="flex-1 truncate">{d.name}</span>
                          <span className="text-muted-foreground tabular-nums">{Math.round((d.value / pieTotal) * 100)}%</span>
                          <span className="w-20 text-right font-medium tabular-nums">{formatINR(d.value)}</span>
                        </div>
                      ))}
                      {maxCat.name && (
                        <p className="pt-1 text-xs text-muted-foreground">
                          Biggest slice: <span className="font-medium text-foreground">{maxCat.name}</span> at {formatINR(maxCat.value)} — watch this one to save more.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* months bar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ChartColumn className="h-4 w-4 text-emerald-600" /> Income vs expense — last 6 months
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[26rem] pt-2">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.months ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                      <Tooltip
                        formatter={(value, name) => [formatINR(Number(value)), name === "income" ? "Income" : "Expense"]}
                        contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* category quick stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {EXPENSE_CATEGORIES.slice(0, 5).map((c) => {
              const found = pieData.find((d) => d.name === c.name);
              return (
                <Card key={c.name} className="py-4">
                  <CardContent className="flex items-center gap-3 px-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${c.color}1a` }} aria-hidden="true">
                      <c.icon className="h-4.5 w-4.5" style={{ color: c.color }} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{c.name}</p>
                      <p className="text-sm font-semibold tabular-nums">{formatINR(found?.value ?? 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ---------- BUDGETS ---------- */}
        <TabsContent value="budgets" className="mt-4">
          <BudgetsSection refreshKey={refreshKey} onChanged={onChanged} />
        </TabsContent>

        {/* ---------- GOALS ---------- */}
        <TabsContent value="goals" className="mt-4">
          <GoalsSection refreshKey={refreshKey} onChanged={onChanged} />
        </TabsContent>

        {/* ---------- TRANSACTIONS ---------- */}
        <TabsContent value="transactions" className="mt-4">
          <TransactionsSection refreshKey={refreshKey} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
