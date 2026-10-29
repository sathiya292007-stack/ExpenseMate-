"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { blobToWavBase64 } from "@/lib/audio";
import { apiGet, apiSend } from "@/lib/client-api";
import {
  EXPENSE_CATEGORY_NAMES,
  INCOME_CATEGORY_NAMES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import type { ParsedTx, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  CheckCheck,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

const EXAMPLES = [
  "Spent 50 rupees for xerox of notes",
  "Auto fare 30 and tea 15 rupees",
  "Bought reference book for 480 by gpay",
  "Got 500 rupees pocket money from dad",
  "Yesterday lunch 95 rupees at canteen",
];

type Stage = "idle" | "recording" | "processing" | "review";

export function VoiceView({ refreshKey, onChanged }: Props) {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [saving, setSaving] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textParsing, setTextParsing] = useState(false);
  const [voiceTxs, setVoiceTxs] = useState<Transaction[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadVoiceTxs = useCallback(async () => {
    try {
      const data = await apiGet<{ transactions: Transaction[] }>("/api/transactions?source=voice&limit=8");
      setVoiceTxs(data.transactions);
    } catch {
      // ignore
    } finally {
      setVoiceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVoiceTxs();
  }, [loadVoiceTxs, refreshKey]);

  // ---- recording ----
  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processBlob = async (blob: Blob) => {
    setStage("processing");
    try {
      const wavBase64 = await blobToWavBase64(blob);
      const data = await apiSend<{ transcript: string; parsed: ParsedTx[] }>("/api/voice/parse", "POST", { audio: wavBase64 });
      setTranscript(data.transcript);
      setParsed(data.parsed);
      if (data.parsed.length === 0) {
        toast({
          title: "No expenses found in that audio",
          description: `Heard: "${data.transcript}". Try mentioning an amount, or type it below.`,
          variant: "destructive",
        });
        setStage("idle");
      } else {
        setStage("review");
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not process audio", variant: "destructive" });
      setStage("idle");
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Microphone not supported here — use text entry below", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        void processBlob(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setStage("recording");
      startTimer();
    } catch {
      toast({ title: "Microphone permission denied. Use the text box below instead.", variant: "destructive" });
      setStage("idle");
    }
  };

  const stopRecording = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  // ---- upload ----
  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Audio too large (max 15 MB)", variant: "destructive" });
      return;
    }
    await processBlob(file);
  };

  // ---- text fallback ----
  const parseText = async () => {
    if (!textContent.trim()) {
      toast({ title: "Type something like: spent 50 rupees for xerox", variant: "destructive" });
      return;
    }
    setTextParsing(true);
    try {
      const data = await apiSend<{ transcript: string; parsed: ParsedTx[] }>("/api/voice/parse", "POST", { text: textContent.trim() });
      setTranscript(data.transcript);
      setParsed(data.parsed);
      if (data.parsed.length === 0) {
        toast({ title: "Couldn't find any amount in that. Try: 'spent 50 rupees for xerox'", variant: "destructive" });
      } else {
        setStage("review");
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Parse failed", variant: "destructive" });
    } finally {
      setTextParsing(false);
    }
  };

  // ---- review editing ----
  const updateParsed = (idx: number, patch: Partial<ParsedTx>) => {
    setParsed((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };
  const removeParsed = (idx: number) => setParsed((prev) => prev.filter((_, i) => i !== idx));

  const saveAll = async () => {
    if (parsed.length === 0) return;
    setSaving(true);
    try {
      const res = await apiSend<{ created: number }>("/api/transactions/batch", "POST", { transactions: parsed });
      toast({ title: `${res.created} entr${res.created === 1 ? "y" : "ies"} saved from voice` });
      setParsed([]);
      setTranscript("");
      setTextContent("");
      setStage("idle");
      onChanged();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalParsed = parsed.reduce((s, p) => (p.type === "expense" ? s + p.amount : s), 0);
  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Voice entry</h1>
        <p className="text-sm text-muted-foreground">Say it once — AI turns your words into expense records.</p>
      </div>

      {/* recorder card */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-5 py-8">
          {stage === "idle" && (
            <>
              <button
                onClick={startRecording}
                className="group flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 hover:bg-emerald-700 active:scale-95"
                aria-label="Start recording"
              >
                <Mic className="h-10 w-10" />
              </button>
              <div className="text-center">
                <p className="font-medium">Tap the mic and speak your expense</p>
                <p className="mt-1 text-xs text-muted-foreground">e.g. &quot;Spent fifty rupees for xerox of notes&quot;</p>
              </div>
            </>
          )}

          {stage === "recording" && (
            <>
              <button
                onClick={stopRecording}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/25 transition-transform hover:scale-105 active:scale-95"
                aria-label="Stop recording"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden="true" />
                <Square className="h-8 w-8" />
              </button>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold tabular-nums text-red-600">{timerLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">Listening… tap to stop</p>
              </div>
            </>
          )}

          {stage === "processing" && (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-medium">Understanding your audio…</p>
                <p className="mt-1 text-xs text-muted-foreground">Transcribing and extracting amounts, categories & dates</p>
              </div>
            </>
          )}

          {/* upload + divider */}
          {stage !== "recording" && stage !== "processing" && (
            <div className="flex w-full max-w-sm flex-col gap-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" /> Upload a voice note
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.webm,.mp3,.wav,.m4a,.ogg"
                  className="hidden"
                  onChange={(e) => {
                    void onFilePicked(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* text fallback */}
      {stage === "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AudioLines className="h-4 w-4 text-emerald-600" /> No mic? Type it instead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-[70px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              placeholder='e.g. "spent 30 for auto and 20 for tea, also xerox 50"'
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              aria-label="Type your expenses as text"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTextContent(ex)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button onClick={parseText} disabled={textParsing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {textParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Extract with AI
            </Button>
          </CardContent>
        </Card>
      )}

      {/* review */}
      {stage === "review" && (
        <Card className="border-emerald-300 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Review before saving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm italic text-muted-foreground">
              &ldquo;{transcript}&rdquo;
            </div>

            {parsed.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing left to save — all items removed.</p>
            )}

            {parsed.map((p, idx) => (
              <ParsedCard key={idx} item={p} index={idx} onChange={(patch) => updateParsed(idx, patch)} onRemove={() => removeParsed(idx)} />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm text-muted-foreground">
                {parsed.length} item{parsed.length === 1 ? "" : "s"} · {formatExpenseTotal(totalParsed)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStage("idle");
                    setParsed([]);
                    setTranscript("");
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Discard
                </Button>
                <Button onClick={saveAll} disabled={saving || parsed.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                  Save {parsed.length > 0 ? parsed.length : ""} to diary
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* recent voice entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Mic className="h-4 w-4 text-emerald-600" /> Saved from voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {voiceLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : voiceTxs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No voice entries yet — try the mic above.</p>
          ) : (
            voiceTxs.map((tx) => <TransactionRow key={tx.id} tx={tx} onChanged={onChanged} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatExpenseTotal(total: number): string {
  return `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(total)} expenses`;
}

function ParsedCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ParsedTx;
  index: number;
  onChange: (patch: Partial<ParsedTx>) => void;
  onRemove: () => void;
}) {
  const isIncome = item.type === "income";
  const categoryNames = isIncome ? INCOME_CATEGORY_NAMES : EXPENSE_CATEGORY_NAMES;

  return (
    <div className={cn("rounded-xl border-2 p-3", isIncome ? "border-emerald-200 dark:border-emerald-900" : "border-border")}>
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isIncome ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300")}>
          {isIncome ? "Income" : "Expense"} #{index + 1}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove item">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="col-span-1 space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={item.type} onValueChange={(v) => onChange({ type: v as ParsedTx["type"], category: v === "income" ? "Other Income" : "Other" })}>
            <SelectTrigger className="h-9" aria-label="Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Amount (₹)</Label>
          <Input type="number" min="0" className="h-9" value={item.amount} onChange={(e) => onChange({ amount: Number(e.target.value) })} aria-label="Amount" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={item.category} onValueChange={(v) => onChange({ category: v })}>
            <SelectTrigger className="h-9" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryNames.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" className="h-9" value={item.date} onChange={(e) => onChange({ date: e.target.value })} aria-label="Date" />
        </div>

        <div className="col-span-2 space-y-1 md:col-span-2">
          <Label className="text-xs">Description</Label>
          <Input className="h-9" value={item.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="what was it for?" aria-label="Description" />
        </div>

        <div className="col-span-2 space-y-1 md:col-span-2">
          <Label className="text-xs">Payment</Label>
          <Select value={item.paymentMethod} onValueChange={(v) => onChange({ paymentMethod: v })}>
            <SelectTrigger className="h-9" aria-label="Payment method">
              <SelectValue />
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
      </div>
    </div>
  );
}
