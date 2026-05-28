"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { getPredictionLockTime } from "@/lib/constants";

interface Team {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string;
}

interface PredictionFormProps {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  matchUtcDate: Date;
  existingPrediction?: {
    predictedHomeGoals: number;
    predictedAwayGoals: number;
  } | null;
  onSaved?: () => void;
}

function useCountdown(lockTime: Date) {
  const [timeLeft, setTimeLeft] = useState<number>(Number.POSITIVE_INFINITY);

  useEffect(() => {
    const update = () => {
      const remaining = lockTime.getTime() - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    };
    const timeout = window.setTimeout(update, 0);
    const interval = setInterval(() => {
      const remaining = lockTime.getTime() - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [lockTime]);

  return timeLeft;
}

function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return "Calculating";
  if (ms <= 0) return "Locked";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function TeamLabel({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "left" && <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />}
      <span className="truncate text-sm font-bold">{team.shortName}</span>
      {align === "right" && <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />}
    </div>
  );
}

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  matchUtcDate,
  existingPrediction,
  onSaved,
}: PredictionFormProps) {
  const router = useRouter();
  const lockTime = getPredictionLockTime(new Date(matchUtcDate));
  const timeLeft = useCountdown(lockTime);
  const isLocked = timeLeft <= 0;

  const [homeGoals, setHomeGoals] = useState<string>(
    existingPrediction != null ? String(existingPrediction.predictedHomeGoals) : ""
  );
  const [awayGoals, setAwayGoals] = useState<string>(
    existingPrediction != null ? String(existingPrediction.predictedAwayGoals) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLocked) return;
      setError("");

      const h = parseInt(homeGoals);
      const a = parseInt(awayGoals);

      if (isNaN(h) || isNaN(a)) {
        setError("Please enter a valid score for both teams.");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            predictedHomeGoals: h,
            predictedAwayGoals: a,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to save prediction");
        } else {
          setSaved(true);
          onSaved?.();
          router.refresh();
          setTimeout(() => setSaved(false), 3000);
        }
      } catch {
        setError("Network error - please try again");
      } finally {
        setSaving(false);
      }
    },
    [isLocked, homeGoals, awayGoals, matchId, onSaved, router]
  );

  if (isLocked) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-medium text-muted-foreground">
        <Lock className="h-4 w-4" />
        Predictions are locked for this match.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLabel team={homeTeam} />

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/70 p-2">
          <label className="sr-only" htmlFor={`home-score-${matchId}`}>
            {homeTeam.name} goals
          </label>
          <Input
            id={`home-score-${matchId}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={homeGoals}
            onChange={(e) => setHomeGoals(e.target.value)}
            className="h-12 w-14 rounded-xl text-center text-xl font-black sm:w-16"
            placeholder="0"
            disabled={isLocked}
            aria-invalid={!!error}
          />
          <span className="text-lg font-black text-muted-foreground">-</span>
          <label className="sr-only" htmlFor={`away-score-${matchId}`}>
            {awayTeam.name} goals
          </label>
          <Input
            id={`away-score-${matchId}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={awayGoals}
            onChange={(e) => setAwayGoals(e.target.value)}
            className="h-12 w-14 rounded-xl text-center text-xl font-black sm:w-16"
            placeholder="0"
            disabled={isLocked}
            aria-invalid={!!error}
          />
        </div>

        <TeamLabel team={awayTeam} align="right" />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {saved && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Prediction saved.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Clock className="h-4 w-4" />
          Locks in {formatCountdown(timeLeft)}
        </span>
        <Button type="submit" className="w-full sm:w-auto" disabled={saving || isLocked}>
          {saving ? "Saving..." : existingPrediction ? "Update prediction" : "Save prediction"}
        </Button>
      </div>
    </form>
  );
}
