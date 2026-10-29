"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  toISODate,
  type TxType,
} from "@/lib/constants";
import { apiSend } from "@/lib/client-api";
import type { Transaction } from "@/lib/types";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Transaction | null;
  defaultType?: TxType;
  onSaved: () => void;
}

export function TransactionFormDialog({ open, onOpenChange, initial, defaultType = "expense", onSaved }: Props) {
  const { toast } = useToast();
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [date, setDate] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type);
        setAmount(String(initial.amount));
        setCategory(initial.category);
        setDescription(initial.description);
        setPaymentMethod(initial.paymentMethod);
        setDate(initial.date.slice(0, 10));
      } else {
        setType(defaultType);
        setAmount("");
        setCategory("");
        setDescription("");
        setPaymentMethod("cash");
        setDate(toISODate(new Date()));
      }
    }
  }, [open, initial, defaultType]);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const switchType = (t: TxType) => {
    setType(t);
    setCategory("");
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Pick a category", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type,
        amount: amt,
        category,
        description: description.trim(),
        paymentMethod,
        date,
      };
      if (initial) {
        await apiSend(`/api/transactions/${initial.id}`, "PATCH", payload);
        toast({ title: "Transaction updated" });
      } else {
        await apiSend("/api/transactions", "POST", payload);
        toast({ title: type === "expense" ? "Expense added" : "Income added" });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update the details of this entry." : "Record money going out or coming in."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchType("expense")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                type === "expense"
                  ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={type === "expense"}
            >
              <TrendingDown className="h-4 w-4" /> Expense
            </button>
            <button
              type="button"
              onClick={() => switchType("income")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                type === "income"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={type === "income"}
            >
              <TrendingUp className="h-4 w-4" /> Income
            </button>
          </div>

          {/* amount */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">Amount (₹)</Label>
            <Input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
          </div>

          {/* category chips */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-colors",
                    category === c.name
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                      : "border-border hover:bg-muted"
                  )}
                  aria-pressed={category === c.name}
                >
                  <c.icon className={cn("h-4 w-4", category === c.name ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                  <span className="leading-tight text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* description */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description (optional)</Label>
            <Input
              id="tx-desc"
              placeholder="e.g. xerox of notes, bus fare"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger aria-label="Payment method">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
