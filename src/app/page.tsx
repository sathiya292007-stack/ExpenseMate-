"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, type TabKey } from "@/components/app-shell";
import { DashboardView } from "@/components/views/dashboard-view";
import { VoiceView } from "@/components/views/voice-view";
import { AnalysisView } from "@/components/views/analysis-view";
import { apiGet } from "@/lib/client-api";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);

  const onChanged = useCallback(() => setRefreshKey((k) => k + 1), []);

  // lightweight balance poll for the sidebar/header
  useEffect(() => {
    let active = true;
    apiGet<{ totals: { balance: number } }>("/api/summary?period=all")
      .then((d) => {
        if (active) setBalance(d.totals.balance);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <AppShell tab={tab} onTabChange={setTab} balance={balance}>
      {tab === "dashboard" && (
        <DashboardView refreshKey={refreshKey} onChanged={onChanged} onGoVoice={() => setTab("voice")} />
      )}
      {tab === "voice" && <VoiceView refreshKey={refreshKey} onChanged={onChanged} />}
      {tab === "analysis" && <AnalysisView refreshKey={refreshKey} onChanged={onChanged} />}
    </AppShell>
  );
}
