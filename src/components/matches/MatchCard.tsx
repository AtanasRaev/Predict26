import Link from "next/link";
import { TeamCrest } from "@/components/ui/TeamCrest";
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
  predictionStatus?: "predicted" | "not_predicted" | "locked" | "not_open";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-muted text-muted-foreground",
    LIVE: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
    FINISHED: "bg-secondary text-secondary-foreground",
    POSTPONED: "bg-yellow-500/15 text-yellow-500",
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
        styles[status] ?? styles.SCHEDULED
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function PredictionBadge({
  status,
}: {
  status?: "predicted" | "not_predicted" | "locked" | "not_open";
}) {
  if (!status) return null;

  if (status === "predicted") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
        ✓ Predicted
      </span>
    );
  }
  if (status === "not_predicted") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20">
        Predict now
      </span>
    );
  }
  if (status === "not_open") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        Not open yet
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
  const isLive = status === "LIVE";
  const stageLabel = group
    ? `Group ${group.replace("GROUP_", "")}`
    : stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link
      href={`/match/${id}`}
      className={cn(
        "block border rounded-lg p-4 transition-all hover:border-primary/30 hover:bg-muted/30",
        isLive && "border-emerald-500/40 bg-emerald-500/5"
      )}
    >
      {/* Stage + badges row */}
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
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <TeamCrest crestUrl={homeTeam.crestUrl} teamName={homeTeam.name} size="md" />
          <span className="font-semibold text-sm truncate">{homeTeam.shortName}</span>
        </div>

        {/* Score / time */}
        <div className="text-center shrink-0 min-w-[90px]">
          {(isFinished || isLive) && homeScore !== null && awayScore !== null ? (
            <div className={cn("text-2xl font-bold tabular-nums", isLive && "text-emerald-400")}>
              {homeScore} — {awayScore}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground font-medium">
              {formatDate(utcDate)}
            </div>
          )}
          {/* User prediction */}
          {userPrediction && (
            <div className="text-xs text-muted-foreground mt-1">
              You: {userPrediction.predictedHomeGoals}–{userPrediction.predictedAwayGoals}
              {userPrediction.points !== null && userPrediction.points !== undefined && (
                <span className="ml-1 font-semibold text-primary">
                  ({userPrediction.points}pt{userPrediction.points !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <span className="font-semibold text-sm truncate">{awayTeam.shortName}</span>
          <TeamCrest crestUrl={awayTeam.crestUrl} teamName={awayTeam.name} size="md" />
        </div>
      </div>

      {/* Prediction count */}
      <div className="mt-3 text-xs text-muted-foreground/60 text-right">
        {predictionCount} prediction{predictionCount !== 1 ? "s" : ""}
      </div>
    </Link>
  );
}
