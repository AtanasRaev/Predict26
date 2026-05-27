import Link from "next/link";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string;
}

interface UserPrediction {
  id: string;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  points?: number | null;
}

interface MatchCardProps {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  utcDate: Date;
  stage: string;
  group?: string | null;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  isKnockout: boolean;
  predictionCount: number;
  userPrediction?: UserPrediction | null;
  predictionStatus?: "predicted" | "not_predicted" | "locked";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    SCHEDULED: "bg-muted text-muted-foreground",
    LIVE: "bg-green-500/15 text-green-700 dark:text-green-400",
    FINISHED: "bg-secondary text-secondary-foreground",
    POSTPONED: "bg-yellow-500/15 text-yellow-700",
    CANCELLED: "bg-destructive/15 text-destructive",
  };

  const labels: Record<string, string> = {
    SCHEDULED: "Upcoming",
    LIVE: "🔴 Live",
    FINISHED: "Finished",
    POSTPONED: "Postponed",
    CANCELLED: "Cancelled",
  };

  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        variants[status] ?? variants.SCHEDULED
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function PredictionBadge({
  status,
}: {
  status?: "predicted" | "not_predicted" | "locked";
}) {
  if (!status) return null;

  if (status === "predicted") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400">
        ✓ Predicted
      </span>
    );
  }
  if (status === "not_predicted") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700">
        Predict now
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      🔒 Locked
    </span>
  );
}

export function MatchCard({
  id,
  homeTeam,
  awayTeam,
  utcDate,
  stage,
  group,
  status,
  homeScore,
  awayScore,
  predictionCount,
  userPrediction,
  predictionStatus,
}: MatchCardProps) {
  const isFinished = status === "FINISHED";
  const stageLabel = group
    ? `Group ${group.replace("GROUP_", "")}`
    : stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link
      href={`/match/${id}`}
      className="block border rounded-lg p-4 hover:bg-muted/40 transition-colors"
    >
      {/* Stage + time row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{stageLabel}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <PredictionBadge status={predictionStatus} />
        </div>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-between gap-4">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamCrest
            crestUrl={homeTeam.crestUrl}
            teamName={homeTeam.name}
            size="md"
          />
          <span className="font-medium text-sm truncate">{homeTeam.shortName}</span>
        </div>

        {/* Score / time */}
        <div className="text-center shrink-0 min-w-[80px]">
          {isFinished && homeScore !== null && awayScore !== null ? (
            <div className="text-2xl font-bold tabular-nums">
              {homeScore} — {awayScore}
            </div>
          ) : status === "LIVE" && homeScore !== null && awayScore !== null ? (
            <div className="text-2xl font-bold tabular-nums text-green-600">
              {homeScore} — {awayScore}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {formatDate(utcDate)}
            </div>
          )}
          {/* User prediction */}
          {userPrediction && (
            <div className="text-xs text-muted-foreground mt-1">
              You: {userPrediction.predictedHomeGoals}–{userPrediction.predictedAwayGoals}
              {userPrediction.points !== null && userPrediction.points !== undefined && (
                <span className="ml-1 font-semibold text-foreground">
                  ({userPrediction.points}pt{userPrediction.points !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-medium text-sm truncate">{awayTeam.shortName}</span>
          <TeamCrest
            crestUrl={awayTeam.crestUrl}
            teamName={awayTeam.name}
            size="md"
          />
        </div>
      </div>

      {/* Prediction count */}
      <div className="mt-3 text-xs text-muted-foreground text-right">
        {predictionCount} prediction{predictionCount !== 1 ? "s" : ""}
      </div>
    </Link>
  );
}
