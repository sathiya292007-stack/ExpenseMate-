"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { apiGet } from "@/lib/client-api";
import { formatINR, type TxType } from "@/lib/constants";
import type { SummaryData, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Loader2,
  Mic,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  refreshKey: number;
  onChanged: () => void;
  onGoVoice: () => void;
}

export function DashboardView({ refreshKey, onChanged, onGoVoice }: Props) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<TxType>("expense");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<SummaryData>("/api/summary?period=this_month");
      setSummary(data);
      setIsEmpty(data.totals.income === 0 && data.totals.expense === 0 && data.recent.length === 0);
    } catch {
      // keep prior data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openAdd = (t: TxType) => {
    setEditing(null);
    setFormType(t);
    setFormOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      onChanged();
    } finally {
      setSeeding(false);
    }
  };

  const delta =
    summary && summary.thisMonth.prevExpense > 0
      ? Math.round(((summary.thisMonth.expense - summary.thisMonth.prevExpense) / summary.thisMonth.prevExpense) * 100)
      : null;

  const alerts = (summary?.budgetStatus ?? []).filter((b) => b.status !== "ok");

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Know where every rupee goes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openAdd("expense")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-1 h-4 w-4" /> Add Expense
          </Button>
          <Button onClick={() => openAdd("income")} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            <Plus className="mr-1 h-4 w-4" /> Add Income
          </Button>
        </div>
      </div>

      {/* empty state */}
      {isEmpty && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Wallet className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Add your first expense, or load sample data to explore the app.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openAdd("expense")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-1 h-4 w-4" /> Add first expense
              </Button>
              <Button variant="outline" onClick={seed} disabled={seeding}>
                {seeding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Load sample data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* budget alerts */}
      {alerts.length > 0 && (
        <Alert className={cn(alerts.some((a) => a.status === "exceeded") ? "border-red-300 bg-red-50 dark:bg-red-950/40" : "border-amber-300 bg-amber-50 dark:bg-amber-950/40")}>
          <AlertTriangle className={cn("h-4 w-4", alerts.some((a) => a.status === "exceeded") ? "text-red-600" : "text-amber-600")} />
          <AlertTitle className="text-sm font-semibold">Budget warning</AlertTitle>
          <AlertDescription className="text-sm">
            {alerts
              .map((a) => `${a.category}: ${formatINR(a.spent)} of ${formatINR(a.limit)} (${a.pct}%)${a.status === "exceeded" ? " — exceeded!" : " — almost there"}`)
              .join(" · ")}
          </AlertDescription>
        </Alert>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className={cn("text-xl font-bold tabular-nums md:text-2xl", (summary?.totals.balance ?? 0) < 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400")}>
                {formatINR(summary?.totals.balance ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">income minus expense (all time)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Income this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 md:text-2xl">
                {formatINR(summary?.thisMonth.income ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">money coming in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" /> Expense this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 md:text-2xl">
                {formatINR(summary?.thisMonth.expense ?? 0)}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {delta !== null && (
                <span className={cn("inline-flex items-center font-medium", delta > 0 ? "text-red-600" : "text-emerald-600")}>
                  {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(delta)}%
                </span>
              )}
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <PiggyBank className="h-3.5 w-3.5" /> Savings rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold tabular-nums md:text-2xl">{summary?.thisMonth.savingsRate ?? 0}%</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">of this month&apos;s income saved</p>
          </CardContent>
        </Card>
      </div>

      {/* voice CTA */}
      <button
        onClick={onGoVoice}
        className="group flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3.5 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-transform group-hover:scale-105">
          <Mic className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Speak your expenses instead of typing</span>
          <span className="block text-xs text-muted-foreground">Tap here, say &quot;spent 50 rupees for xerox&quot; — AI fills the rest</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600" />
      </button>

      {/* charts + recent */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pt-2">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.daily ?? []} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    formatter={(value, name) => [formatINR(Number(value)), name === "expense" ? "Expense" : "Income"]}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : (summary?.recent.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet — add your first entry.</p>
            ) : (
              summary?.recent.map((tx) => <TransactionRow key={tx.id} tx={tx} onEdit={openEdit} onChanged={onChanged} />)
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} defaultType={formType} onSaved={onChanged} />
    </div>
  );
}
