"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";

interface SyncLog {
  id: string;
  syncType: string;
  startedAt: string;
  finishedAt?: string | null;
  status: string;
  errorMessage?: string | null;
  requestCount: number;
}

interface SyncControlsProps {
  initialLogs: SyncLog[];
}

type SyncEndpoint = "fixtures" | "scores" | "standings";

function timeSince(date: string | null | undefined): string {
  if (!date) return "never";
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function SyncControls({ initialLogs }: SyncControlsProps) {
  const [logs, setLogs] = useState<SyncLog[]>(initialLogs);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  // Get last log per sync type
  const lastLog = (type: string) =>
    logs.find((l) => l.syncType === type && l.status === "SUCCESS");

  async function triggerSync(endpoint: SyncEndpoint) {
    setLoading((l) => ({ ...l, [endpoint]: true }));
    setResults((r) => ({ ...r, [endpoint]: "" }));

    try {
      const res = await fetch(`/api/admin/sync/${endpoint}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setResults((r) => ({ ...r, [endpoint]: `Error: ${data.error}` }));
      } else if (data.skipped) {
        setResults((r) => ({ ...r, [endpoint]: `Skipped: ${data.reason}` }));
      } else {
        setResults((r) => ({
          ...r,
          [endpoint]: `✓ Synced ${data.synced ?? data.synced} records`,
        }));
        // Refresh logs
        const logsRes = await fetch("/api/admin/sync-logs");
        if (logsRes.ok) setLogs(await logsRes.json());
      }
    } catch {
      setResults((r) => ({ ...r, [endpoint]: "Network error" }));
    } finally {
      setLoading((l) => ({ ...l, [endpoint]: false }));
    }
  }

  async function triggerRecalculate() {
    setLoading((l) => ({ ...l, recalculate: true }));
    setResults((r) => ({ ...r, recalculate: "" }));
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      const data = await res.json();
      setResults((r) => ({
        ...r,
        recalculate: res.ok ? "✓ All points recalculated" : `Error: ${data.error}`,
      }));
    } catch {
      setResults((r) => ({ ...r, recalculate: "Network error" }));
    } finally {
      setLoading((l) => ({ ...l, recalculate: false }));
    }
  }

  async function triggerClearData() {
    if (!confirm("⚠️ This will delete ALL matches, teams, standings, and predictions. Are you sure?")) return;
    setLoading((l) => ({ ...l, clearData: true }));
    setResults((r) => ({ ...r, clearData: "" }));
    try {
      const res = await fetch("/api/admin/clear-data", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        const d = data.deleted;
        setResults((r) => ({
          ...r,
          clearData: `✓ Deleted: ${d.matches} matches, ${d.teams} teams, ${d.predictions} predictions, ${d.standings} standings`,
        }));
      } else {
        setResults((r) => ({ ...r, clearData: `Error: ${data.error}` }));
      }
    } catch {
      setResults((r) => ({ ...r, clearData: "Network error" }));
    } finally {
      setLoading((l) => ({ ...l, clearData: false }));
    }
  }

  const controls: {
    key: string;
    label: string;
    desc: string;
    action: () => void;
  }[] = [
    {
      key: "fixtures",
      label: "Sync Fixtures",
      desc: `Last: ${timeSince(lastLog("FIXTURES")?.finishedAt)} · Updates all matches + teams`,
      action: () => triggerSync("fixtures"),
    },
    {
      key: "scores",
      label: "Sync Scores",
      desc: `Last: ${timeSince(lastLog("SCORES")?.finishedAt)} · Updates recent match scores`,
      action: () => triggerSync("scores"),
    },
    {
      key: "standings",
      label: "Sync Standings",
      desc: `Last: ${timeSince(lastLog("STANDINGS")?.finishedAt)} · Updates group tables`,
      action: () => triggerSync("standings"),
    },
    {
      key: "recalculate",
      label: "Recalculate All Points",
      desc: "Recalculates points for all finished matches",
      action: triggerRecalculate,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {controls.map(({ key, label, desc, action }) => (
          <div key={key} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                {results[key] && (
                  <p className={`text-xs mt-1 ${results[key].startsWith("✓") ? "text-green-500" : "text-destructive"}`}>
                    {results[key]}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={action}
                disabled={loading[key]}
                className="shrink-0"
              >
                {loading[key] ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Run</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm text-destructive">Clear All Match Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deletes all matches, teams, standings, and predictions. Use when switching competitions.
            </p>
            {results.clearData && (
              <p className={`text-xs mt-1 ${results.clearData.startsWith("✓") ? "text-green-500" : "text-destructive"}`}>
                {results.clearData}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={triggerClearData}
            disabled={loading.clearData}
            className="shrink-0"
          >
            {loading.clearData ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Clear</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
