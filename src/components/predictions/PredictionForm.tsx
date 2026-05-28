"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [timeLeft, setTimeLeft] = useState<number>(
    lockTime.getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = lockTime.getTime() - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockTime]);

  return timeLeft;
}

function formatCountdown(ms: number): string {
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
          // Immediately re-fetch all server components so the predictions list
          // (and leaderboard, fixtures, etc.) shows the updated data right away.
          router.refresh();
          setTimeout(() => setSaved(false), 3000);
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setSaving(false);
      }
    },
    [isLocked, homeGoals, awayGoals, matchId, onSaved]
  );

  if (isLocked) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
        🔒 Predictions are locked for this match.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right text-sm font-medium">{homeTeam.shortName}</div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={30}
            value={homeGoals}
            onChange={(e) => setHomeGoals(e.target.value)}
            className="w-16 text-center text-lg font-bold"
            placeholder="0"
            disabled={isLocked}
          />
          <span className="text-muted-foreground font-medium">—</span>
          <Input
            type="number"
            min={0}
            max={30}
            value={awayGoals}
            onChange={(e) => setAwayGoals(e.target.value)}
            className="w-16 text-center text-lg font-bold"
            placeholder="0"
            disabled={isLocked}
          />
        </div>

        <div className="flex-1 text-sm font-medium">{awayTeam.shortName}</div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Locks in: <span className="font-medium">{formatCountdown(timeLeft)}</span>
        </span>
        <Button type="submit" size="sm" disabled={saving || isLocked}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : existingPrediction ? "Update prediction" : "Save prediction"}
        </Button>
      </div>
    </form>
  );
}
