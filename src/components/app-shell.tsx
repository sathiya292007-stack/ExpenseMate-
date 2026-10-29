"use client";

import { cn } from "@/lib/utils";
import { ChartPie, LayoutDashboard, Mic, Wallet } from "lucide-react";
import { formatINR } from "@/lib/constants";

export type TabKey = "dashboard" | "voice" | "analysis";

const NAV: Array<{ key: TabKey; label: string; short: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { key: "voice", label: "Voice Entry", short: "Voice", icon: Mic },
  { key: "analysis", label: "Analysis & Budgets", short: "Analysis", icon: ChartPie },
];

interface Props {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  balance: number | null;
}

export function AppShell({ tab, onTabChange, balance, children }: Props & { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-background to-background">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card lg:flex" aria-label="Main navigation">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight">ExpenseMate</p>
            <p className="text-[11px] text-muted-foreground">Every rupee, tracked</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                tab === item.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={tab === item.key ? "page" : undefined}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
          <p className="text-xs opacity-80">Current balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{balance === null ? "…" : formatINR(balance)}</p>
          <p className="mt-1 text-[11px] opacity-75">across all time</p>
        </div>
      </aside>

      {/* mobile header */}
      <header className="sticky top-0 z-40 flex items-center gap-2.5 border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Wallet className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold leading-tight">ExpenseMate</p>
          <p className="text-[11px] text-muted-foreground">
            Balance: <span className={cn("font-semibold tabular-nums", (balance ?? 0) < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400")}>{balance === null ? "…" : formatINR(balance)}</span>
          </p>
        </div>
      </header>

      {/* main content */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-6 lg:ml-60 lg:max-w-[calc(100%-15rem)] lg:pb-10">
        {children}
      </main>

      {/* mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-3">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                tab === item.key ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}
              aria-current={tab === item.key ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
              {item.short}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
