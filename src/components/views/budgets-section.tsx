"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiSend } from "@/lib/client-api";
import { EXPENSE_CATEGORY_NAMES, formatINR, getCategory } from "@/lib/constants";
import type { BudgetStatus, BudgetSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, MoreVertical, Pencil, Plus, Target, Trash2, TrendingDown, TriangleAlert, Sparkles } from "lucide-react";

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

export function BudgetsSection({ refreshKey, onChanged }: Props) {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ budgets: BudgetStatus[] }>("/api/budgets");
      setBudgets(data.budgets);
      const sum = await apiGet<{ suggestions: BudgetSuggestion[] }>("/api/summary?period=this_month");
      setSuggestions(sum.suggestions ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openCreate = () => {
    setEditCategory(null);
    setCategory("");
    setLimit("");
    setDialogOpen(true);
  };

  const openEdit = (b: BudgetStatus) => {
    setEditCategory(b.category);
    setCategory(b.category);
    setLimit(String(b.limit));
    setDialogOpen(true);
  };

  const saveBudget = async () => {
    const lim = Number(limit);
    if (!category) {
      toast({ title: "Pick a category", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(lim) || lim <= 0) {
      toast({ title: "Enter a valid limit", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiSend("/api/budgets", "POST", { category, limit: lim });
      toast({ title: `Budget set: ${category} — ${formatINR(lim)}/month` });
      setDialogOpen(false);
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to save budget", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeBudget = async (b: BudgetStatus) => {
    try {
      await apiSend(`/api/budgets?id=${b.id}`, "DELETE");
      toast({ title: `Budget removed for ${b.category}` });
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete budget", variant: "destructive" });
    }
  };

  const applySuggestion = async (s: BudgetSuggestion) => {
    try {
      await apiSend("/api/budgets", "POST", { category: s.category, limit: s.suggested });
      toast({ title: `Suggested budget applied: ${s.category} — ${formatINR(s.suggested)}` });
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to apply suggestion", variant: "destructive" });
    }
  };

  const takenCategories = new Set(budgets.map((b) => b.category));
  const availableForNew = EXPENSE_CATEGORY_NAMES.filter((c) => !takenCategories.has(c) || c === editCategory);
  const exceededCount = budgets.filter((b) => b.status === "exceeded").length;
  const warningCount = budgets.filter((b) => b.status === "warning").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 text-emerald-600" />
          {budgets.length === 0
            ? "No budgets yet — set limits to get warnings before you overspend."
            : `${budgets.length} monthly limit${budgets.length === 1 ? "" : "s"} set`}
          {exceededCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <TriangleAlert className="h-3 w-3" /> {exceededCount} exceeded
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" variant="outline">
              <AlertTriangle className="h-3 w-3" /> {warningCount} close to limit
            </Badge>
          )}
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Set budget
        </Button>
      </div>

      {/* AI-style suggestions */}
      {!loading && suggestions.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Suggested budgets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Based on your last 3 months of spending (padded ~10% for wiggle room):</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.category}
                  onClick={() => applySuggestion(s)}
                  className="group flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-600 hover:text-white dark:bg-transparent dark:hover:bg-emerald-800"
                >
                  {s.category} ≈ {formatINR(s.suggested)}
                  <Plus className="h-3 w-3" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* budget cards */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <TrendingDown className="h-8 w-8 text-emerald-600" />
            <p className="font-medium">No budgets set yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Set a monthly limit per category (like Food ₹2,000). The app will warn you at 80% and turn red when you cross it.
            </p>
            <Button onClick={openCreate} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-1 h-4 w-4" /> Set your first budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const cat = getCategory(b.category);
            const isOver = b.status === "exceeded";
            const isWarn = b.status === "warning";
            return (
              <Card key={b.id} className={cn(isOver && "border-red-300 dark:border-red-800", isWarn && "border-amber-300 dark:border-amber-800")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", cat.bg)} aria-hidden="true">
                      <cat.icon className={cn("h-4.5 w-4.5", cat.fg)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{b.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatINR(b.spent)} spent of {formatINR(b.limit)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Options for ${b.category} budget`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(b)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit limit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeBudget(b)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Progress
                    value={Math.min(b.pct, 100)}
                    className={cn("h-2", isOver && "[&>div]:bg-red-500", isWarn && !isOver && "[&>div]:bg-amber-500")}
                    aria-label={`${b.category} budget ${b.pct}% used`}
                  />

                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs font-medium", isOver ? "text-red-600" : isWarn ? "text-amber-600" : "text-emerald-600")}>
                      {isOver
                        ? `Over by ${formatINR(Math.abs(b.remaining))} — slow down!`
                        : isWarn
                          ? `Only ${formatINR(b.remaining)} left this month`
                          : `${formatINR(b.remaining)} left this month`}
                    </p>
                    <span className={cn("text-xs font-bold tabular-nums", isOver ? "text-red-600" : isWarn ? "text-amber-600" : "text-muted-foreground")}>
                      {b.pct}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCategory ? "Edit budget" : "Set a monthly budget"}</DialogTitle>
            <DialogDescription>You&apos;ll get a warning at 80% of the limit and a red alert when exceeded.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={Boolean(editCategory)}>
                <SelectTrigger aria-label="Budget category">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {availableForNew.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget-limit">Monthly limit (₹)</Label>
              <Input id="budget-limit" type="number" min="0" placeholder="e.g. 2000" value={limit} onChange={(e) => setLimit(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBudget} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saving…" : "Save budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
