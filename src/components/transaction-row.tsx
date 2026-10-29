"use client";

import { getCategory, formatINR, formatDate, PAYMENT_METHODS } from "@/lib/constants";
import type { Transaction } from "@/lib/types";
import { Mic, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiSend } from "@/lib/client-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  tx: Transaction;
  onEdit?: (tx: Transaction) => void;
  onChanged?: () => void;
}

export function TransactionRow({ tx, onEdit, onChanged }: Props) {
  const { toast } = useToast();
  const cat = getCategory(tx.category);
  const isIncome = tx.type === "income";
  const pmLabel = PAYMENT_METHODS.find((p) => p.value === tx.paymentMethod)?.label ?? tx.paymentMethod;

  const remove = async () => {
    try {
      await apiSend(`/api/transactions/${tx.id}`, "DELETE");
      toast({ title: "Transaction deleted" });
      onChanged?.();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", cat.bg)} aria-hidden="true">
        <cat.icon className={cn("h-5 w-5", cat.fg)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{tx.description || tx.category}</p>
          {tx.source === "voice" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" title="Added by voice">
              <Mic className="h-2.5 w-2.5" /> voice
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {tx.category} · {formatDate(tx.date)} · {pmLabel}
        </p>
      </div>

      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        {isIncome ? "+" : "-"}
        {formatINR(tx.amount)}
      </p>

      {(onEdit || onChanged) && (
        <div className="flex shrink-0 items-center gap-0.5">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tx)} aria-label={`Edit ${tx.description || tx.category}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onChanged && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${tx.description || tx.category}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tx.description || tx.category} · {formatINR(tx.amount)} on {formatDate(tx.date)}. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}
