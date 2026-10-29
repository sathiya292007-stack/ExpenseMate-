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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiSend } from "@/lib/client-api";
import { formatINR } from "@/lib/constants";
import type { SavingsGoal } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Gift,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

export function GoalsSection({ refreshKey, onChanged }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ goals: SavingsGoal[] }>("/api/goals");
      setGoals(data.goals);
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
    setName("");
    setTargetAmount("");
    setSavedAmount("");
    setTargetDate("");
    setCreateOpen(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(String(g.targetAmount));
    setSavedAmount(String(g.savedAmount));
    setTargetDate(g.targetDate ? g.targetDate.slice(0, 10) : "");
    setCreateOpen(true);
  };

  const submitGoal = async () => {
    const t = Number(targetAmount);
    if (!name.trim()) {
      toast({ title: "Give your goal a name", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(t) || t <= 0) {
      toast({ title: "Enter a valid target amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetAmount: t,
        savedAmount: savedAmount ? Number(savedAmount) : 0,
        targetDate: targetDate || null,
      };
      if (editingGoal) {
        await apiSend(`/api/goals/${editingGoal.id}`, "PATCH", payload);
        toast({ title: "Goal updated" });
      } else {
        await apiSend("/api/goals", "POST", payload);
        toast({ title: `Goal created: ${name.trim()}` });
      }
      setCreateOpen(false);
      setEditingGoal(null);
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to save goal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const contribute = async (amount: number) => {
    if (!contributeGoal || !Number.isFinite(amount) || amount === 0) return;
    setSaving(true);
    try {
      const res = await apiSend<{ goal: SavingsGoal }>(`/api/goals/${contributeGoal.id}`, "PATCH", { add: amount });
      toast({
        title: res.goal.completed ? `Goal reached: ${res.goal.name}! 🎉` : `Added ${formatINR(amount)} to ${res.goal.name}`,
      });
      setContributeGoal(null);
      setContributeAmount("");
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to contribute", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async (g: SavingsGoal) => {
    try {
      await apiSend(`/api/goals/${g.id}`, "DELETE");
      toast({ title: `Goal removed: ${g.name}` });
      load();
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete goal", variant: "destructive" });
    }
  };

  const daysLeft = (g: SavingsGoal): number | null => {
    if (!g.targetDate) return null;
    const diff = new Date(g.targetDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PiggyBank className="h-4 w-4 text-emerald-600" />
          Save up for things you want — a laptop, a bicycle, a trip.
        </p>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> New goal
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Target className="h-8 w-8 text-emerald-600" />
            <p className="font-medium">No savings goals yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a goal like &quot;New laptop — ₹45,000&quot; and track how close you are. Every contribution updates the progress bar.
            </p>
            <Button onClick={openCreate} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-1 h-4 w-4" /> Create a goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
            const remaining = Math.max(0, g.targetAmount - g.savedAmount);
            const dl = daysLeft(g);
            const perDay = dl && dl > 0 ? Math.ceil(remaining / dl) : null;
            return (
              <Card key={g.id} className={cn(g.completed && "border-emerald-400 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{g.name}</p>
                        {g.completed && (
                          <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600" variant="outline">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatINR(g.savedAmount)} of {formatINR(g.targetAmount)}
                        {g.targetDate ? ` · by ${new Date(g.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Options for goal ${g.name}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(g)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit goal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeGoal(g)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Progress value={pct} className="h-2.5 [&>div]:bg-emerald-600" aria-label={`${g.name} progress ${pct}%`} />

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">{pct}%</span>
                    <span className="text-muted-foreground">
                      {g.completed ? "Fully funded!" : `${formatINR(remaining)} to go`}
                    </span>
                  </div>

                  {perDay !== null && !g.completed && dl !== null && (
                    <p className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      Save <span className="font-semibold text-foreground">{formatINR(perDay)}/day</span> for the next {dl} day{dl === 1 ? "" : "s"} to make it.
                    </p>
                  )}

                  {!g.completed && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => { setContributeGoal(g); setContributeAmount("100"); }} disabled={saving}>
                        +100
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => { setContributeGoal(g); setContributeAmount("500"); }} disabled={saving}>
                        +500
                      </Button>
                      <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setContributeGoal(g); setContributeAmount(""); }} disabled={saving}>
                        <Gift className="mr-1 h-3 w-3" /> Add money
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* create / edit dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setEditingGoal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit goal" : "New savings goal"}</DialogTitle>
            <DialogDescription>What are you saving for? e.g. laptop, bicycle, trip with friends.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input id="goal-name" placeholder="e.g. New laptop for coding" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Target (₹)</Label>
                <Input id="goal-target" type="number" min="0" placeholder="45000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-saved">Already saved (₹)</Label>
                <Input id="goal-saved" type="number" min="0" placeholder="0" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date (optional)</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingGoal(null); }}>
              Cancel
            </Button>
            <Button onClick={submitGoal} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saving…" : editingGoal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* contribute dialog */}
      <Dialog open={Boolean(contributeGoal)} onOpenChange={(o) => { if (!o) setContributeGoal(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add to {contributeGoal?.name}</DialogTitle>
            <DialogDescription>
              Saved so far: {contributeGoal ? formatINR(contributeGoal.savedAmount) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="contribute-amount">Amount (₹)</Label>
            <Input
              id="contribute-amount"
              type="number"
              min="0"
              placeholder="e.g. 250"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void contribute(Number(contributeAmount));
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeGoal(null)}>
              Cancel
            </Button>
            <Button onClick={() => contribute(Number(contributeAmount))} disabled={saving || !contributeAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Add money
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
