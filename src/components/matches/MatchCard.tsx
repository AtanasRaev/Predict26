import Link from "next/link";
import { CalendarClock, CheckCircle2, Lock, Radio, UsersRound } from "lucide-react";
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
    SCHEDULED: "border-white/10 bg-white/[0.055] text-muted-foreground",
    LIVE: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
    FINISHED: "border-primary/20 bg-primary/12 text-primary",
    POSTPONED: "border-amber-400/30 bg-amber-400/15 text-amber-300",
    CANCELLED: "border-destructive/30 bg-destructive/15 text-destructive",
  };

  const labels: Record<string, string> = {
    SCHEDULED: "Upcoming",
    LIVE: "Live",
    FINISHED: "Finished",
    POSTPONED: "Postponed",
    CANCELLED: "Cancelled",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
        styles[status] ?? styles.SCHEDULED
      )}
    >
      {status === "LIVE" && <Radio className="h-3 w-3" />}
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

  const config = {
    predicted: {
      label: "Saved",
      icon: CheckCircle2,
      className: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
    },
    not_predicted: {
      label: "Predict",
      icon: CalendarClock,
      className: "border-accent/35 bg-accent/15 text-accent",
    },
    not_open: {
      label: "Opens soon",
      icon: CalendarClock,
      className: "border-white/10 bg-white/[0.055] text-muted-foreground",
    },
    locked: {
      label: "Locked",
      icon: Lock,
      className: "border-white/10 bg-white/[0.055] text-muted-foreground",
    },
  }[status];

  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function TeamBlock({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3",
        align === "right" && "justify-end"
      )}
    >
      {align === "left" && <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="md" />}
      <div className={cn("min-w-0", align === "right" && "text-right")}>
        <div className="truncate text-sm font-black sm:text-base">{team.shortName}</div>
        <div className="hidden truncate text-xs text-muted-foreground sm:block">{team.name}</div>
      </div>
      {align === "right" && <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="md" />}
    </div>
  );
}

function TeamRow({ team, score }: { team: Team; score?: number | null }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="md" />
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{team.shortName}</div>
          <div className="truncate text-[11px] text-muted-foreground">{team.name}</div>
        </div>
      </div>
      {score !== undefined && score !== null && (
        <span className="text-2xl font-black tabular-nums">{score}</span>
      )}
    </div>
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
        "group block rounded-xl border border-white/10 bg-card/88 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-xl hover:shadow-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl sm:p-4",
        isLive && "border-emerald-400/35 bg-emerald-400/8"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {stageLabel}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDate(utcDate)} ET
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 min-[430px]:flex-row sm:flex-row">
          <StatusBadge status={status} />
          <PredictionBadge status={predictionStatus} />
        </div>
      </div>

      <div className="space-y-2 sm:hidden">
        <TeamRow team={homeTeam} score={(isFinished || isLive) ? homeScore : undefined} />
        <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-white/10" />
          vs
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <TeamRow team={awayTeam} score={(isFinished || isLive) ? awayScore : undefined} />
        {userPrediction && (
          <div className="rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
            Your pick {userPrediction.predictedHomeGoals}-{userPrediction.predictedAwayGoals}
            {userPrediction.points !== null && userPrediction.points !== undefined && (
              <span className="ml-1 text-primary">+{userPrediction.points}</span>
            )}
          </div>
        )}
      </div>

      <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-3 sm:grid">
        <TeamBlock team={homeTeam} />

        <div className="min-w-[82px] rounded-2xl border border-white/10 bg-background/70 px-3 py-2 text-center">
          {(isFinished || isLive) && homeScore !== null && awayScore !== null ? (
            <div className={cn("text-2xl font-black tabular-nums", isLive && "text-emerald-300")}>
              {homeScore}-{awayScore}
            </div>
          ) : (
            <div className="text-lg font-black uppercase tracking-[0.18em] text-muted-foreground">
              vs
            </div>
          )}
          {userPrediction && (
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
              You {userPrediction.predictedHomeGoals}-{userPrediction.predictedAwayGoals}
              {userPrediction.points !== null && userPrediction.points !== undefined && (
                <span className="ml-1 text-primary">+{userPrediction.points}</span>
              )}
            </div>
          )}
        </div>

        <TeamBlock team={awayTeam} align="right" />
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground sm:mt-4">
        <UsersRound className="h-3.5 w-3.5" />
        {predictionCount} prediction{predictionCount !== 1 ? "s" : ""}
      </div>
    </Link>
  );
}
