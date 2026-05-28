import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { PredictionForm } from "@/components/predictions/PredictionForm";
import { Badge } from "@/components/ui/badge";
import { canSeePredictions, isMatchWithinPredictionWindow } from "@/lib/utils/predictionVisibility";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      winnerTeam: true,
      predictions: {
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

function stageLabel(stage: string, group?: string | null) {
  const labels: Record<string, string> = {
    GROUP_STAGE: "Group Stage",
    ROUND_OF_32: "Round of 32",
    ROUND_OF_16: "Round of 16",
    QUARTER_FINALS: "Quarter-Finals",
    SEMI_FINALS: "Semi-Finals",
    THIRD_PLACE: "Third Place",
    FINAL: "Final",
  };
  const base = labels[stage] ?? stage.replace(/_/g, " ");
  if (group) return `${base} - Group ${group.replace("GROUP_", "")}`;
  return base;
}

export default async function MatchPage({ params }: PageProps) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const match = await getMatch(id);

  if (!match) return notFound();

  const predictionsVisible = canSeePredictions(match.utcDate);
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
    orderBy: { username: "asc" },
  });

  const predictionByUser = new Map(match.predictions.map((p) => [p.userId, p]));
  const userPrediction = predictionByUser.get(session.user.id) ?? null;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {stageLabel(match.stage, match.group)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(match.utcDate)}</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-card/85 p-5 shadow-2xl shadow-black/15 sm:p-7">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex min-w-0 flex-col items-center gap-3">
            <TeamCrest crestUrl={match.homeTeam.crestUrl} teamName={match.homeTeam.name} size="lg" />
            <span className="max-w-full truncate text-center font-black">{match.homeTeam.shortName}</span>
          </div>

          <div className="text-center">
            {(isFinished || isLive) && match.homeScore !== null && match.awayScore !== null ? (
              <div className={`text-4xl font-black tabular-nums sm:text-6xl ${isLive ? "text-emerald-300" : ""}`}>
                {match.homeScore}-{match.awayScore}
              </div>
            ) : (
              <div className="text-3xl font-black uppercase tracking-[0.18em] text-muted-foreground sm:text-5xl">
                vs
              </div>
            )}
            <div className="mt-3">
              {isLive && <Badge className="bg-emerald-500 text-white">Live</Badge>}
              {isFinished && <Badge variant="secondary">Finished</Badge>}
              {match.status === "SCHEDULED" && <Badge variant="outline">Upcoming</Badge>}
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center gap-3">
            <TeamCrest crestUrl={match.awayTeam.crestUrl} teamName={match.awayTeam.name} size="lg" />
            <span className="max-w-full truncate text-center font-black">{match.awayTeam.shortName}</span>
          </div>
        </div>
      </div>

      {!predictionsVisible && isMatchWithinPredictionWindow(match.utcDate) && (
        <section className="rounded-2xl border border-white/10 bg-card/85 p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-lg font-black">Your Prediction</h2>
          <PredictionForm
            matchId={match.id}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            matchUtcDate={match.utcDate}
            existingPrediction={userPrediction}
          />
        </section>
      )}

      {!predictionsVisible && !isMatchWithinPredictionWindow(match.utcDate) && (
        <div className="rounded-2xl border border-white/10 bg-card/75 p-4 text-center text-sm text-muted-foreground">
          Predictions open 2 days before match day.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-card/85 shadow-sm">
        <div className="border-b border-white/10 p-4">
          <h2 className="font-black">Predictions</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {predictionsVisible
              ? `${match.predictions.length} prediction${match.predictions.length !== 1 ? "s" : ""} submitted`
              : "Predictions will be revealed after kickoff"}
          </p>
        </div>

        <div className="divide-y divide-white/10">
          {allUsers.map((user) => {
            const pred = predictionByUser.get(user.id);
            const isCurrentUser = user.id === session.user.id;

            return (
              <div
                key={user.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${isCurrentUser ? "bg-primary/10" : ""}`}
              >
                <div className="min-w-0">
                  <span className="truncate text-sm font-bold">
                    {user.firstName} {user.lastName}
                  </span>
                  {isCurrentUser && (
                    <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {pred ? (
                    <>
                      {(predictionsVisible || isCurrentUser) ? (
                        <span className="font-mono text-sm font-black">
                          {pred.predictedHomeGoals}-{pred.predictedAwayGoals}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Hidden</span>
                      )}
                      {predictionsVisible && pred.points !== null && (
                        <Badge variant={pred.points > 0 ? "default" : "secondary"}>
                          {pred.points}pt{pred.points !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No prediction</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs text-muted-foreground">
        <p className="font-bold text-foreground">Scoring</p>
        <p className="mt-1">Exact score = 3 pts. Correct outcome = 1 pt. Wrong = 0 pts.</p>
      </div>
    </div>
  );
}
