"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { apiGet } from "@/lib/client-api";
import { ALL_CATEGORIES, formatINR } from "@/lib/constants";
import type { Transaction } from "@/lib/types";
import { Download, ReceiptText, Search } from "lucide-react";

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

export function TransactionsSection({ refreshKey, onChanged }: Props) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (type !== "all") params.set("type", type);
      if (category !== "all") params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", "300");
      const data = await apiGet<{ transactions: Transaction[] }>(`/api/transactions?${params.toString()}`);
      setTransactions(data.transactions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, category, from, to]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return { inc, exp, count: transactions.length };
  }, [transactions]);

  const exportCsv = () => {
    if (transactions.length === 0) {
      toast({ title: "Nothing to export with these filters", variant: "destructive" });
      return;
    }
    const header = "Date,Type,Category,Description,Payment Method,Amount (INR),Source\n";
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = transactions
      .map((t) =>
        [
          t.date.slice(0, 10),
          t.type,
          esc(t.category),
          esc(t.description),
          t.paymentMethod,
          t.amount.toFixed(2),
          t.source,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${transactions.length} rows to CSV` });
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setCategory("all");
    setFrom("");
    setTo("");
  };

  const hasFilters = search || type !== "all" || category !== "all" || from || to;

  return (
    <div className="space-y-4">
      {/* filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-8"
                placeholder="Search description or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search transactions"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Filter by type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" title="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" title="To date" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${totals.count} entries · income ${formatINR(totals.inc)} · expense ${formatINR(totals.exp)}`}
            </p>
            <div className="flex gap-2">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No transactions match</p>
            <p className="text-sm text-muted-foreground">Try changing the filters or add a new entry.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onEdit={openEdit} onChanged={onChanged} />
          ))}
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
