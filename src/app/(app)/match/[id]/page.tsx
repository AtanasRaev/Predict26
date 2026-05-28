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

async function getMatch(id: string, userId: string) {
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
  if (group) return `${base} · Group ${group.replace("GROUP_", "")}`;
  return base;
}

export default async function MatchPage({ params }: PageProps) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const match = await getMatch(id, session.user.id);

  if (!match) return notFound();

  const predictionsVisible = canSeePredictions(match.utcDate);
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true },
    orderBy: { username: "asc" },
  });

  const predictionByUser = new Map(
    match.predictions.map((p) => [p.userId, p])
  );

  const userPrediction = predictionByUser.get(session.user.id) ?? null;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Match header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {stageLabel(match.stage, match.group)}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateTime(match.utcDate)}</p>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-around py-6 border rounded-lg bg-card">
        {/* Home */}
        <div className="flex flex-col items-center gap-2">
          <TeamCrest crestUrl={match.homeTeam.crestUrl} teamName={match.homeTeam.name} size="lg" />
          <span className="font-semibold">{match.homeTeam.shortName}</span>
        </div>

        {/* Score */}
        <div className="text-center">
          {(isFinished || isLive) && match.homeScore !== null && match.awayScore !== null ? (
            <div className={`text-5xl font-bold tabular-nums ${isLive ? "text-green-600" : ""}`}>
              {match.homeScore} – {match.awayScore}
            </div>
          ) : (
            <div className="text-4xl font-light text-muted-foreground">vs</div>
          )}
          <div className="mt-2">
            {isLive && <Badge className="bg-green-500 text-white">🔴 Live</Badge>}
            {isFinished && <Badge variant="secondary">Finished</Badge>}
            {match.status === "SCHEDULED" && (
              <Badge variant="outline">Upcoming</Badge>
            )}
          </div>
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2">
          <TeamCrest crestUrl={match.awayTeam.crestUrl} teamName={match.awayTeam.name} size="lg" />
          <span className="font-semibold">{match.awayTeam.shortName}</span>
        </div>
      </div>

      {/* Prediction form */}
      {!predictionsVisible && isMatchWithinPredictionWindow(match.utcDate) && (
        <div className="border rounded-lg p-4 bg-card">
          <h2 className="font-semibold mb-3">Your Prediction</h2>
          <PredictionForm
            matchId={match.id}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            matchUtcDate={match.utcDate}
            existingPrediction={userPrediction}
          />
        </div>
      )}

      {/* Not open yet — match is more than 2 days away */}
      {!predictionsVisible && !isMatchWithinPredictionWindow(match.utcDate) && (
        <div className="border rounded-lg p-4 bg-card text-center text-sm text-muted-foreground">
          🗓️ Predictions open 2 days before match day.
        </div>
      )}

      {/* Predictions list */}
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Predictions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {predictionsVisible
              ? `${match.predictions.length} prediction${match.predictions.length !== 1 ? "s" : ""} submitted`
              : "Predictions will be revealed after kickoff"}
          </p>
        </div>

        <div className="divide-y">
          {allUsers.map((user) => {
            const pred = predictionByUser.get(user.id);
            const isCurrentUser = user.id === session.user.id;

            return (
              <div
                key={user.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  isCurrentUser ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {pred ? (
                    <>
                      <span className="text-sm">
                        {/* Show prediction details only if visible, or it's the current user */}
                        {(predictionsVisible || isCurrentUser) ? (
                          <span className="font-mono font-semibold">
                            {pred.predictedHomeGoals}–{pred.predictedAwayGoals}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Hidden</span>
                        )}
                      </span>
                      {predictionsVisible && pred.points !== null && (
                        <Badge variant={pred.points > 0 ? "default" : "secondary"}>
                          {pred.points}pt{pred.points !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No prediction</span>
                  )}
                  <span>{pred ? "✅" : "❌"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scoring explanation */}
      <div className="text-xs text-muted-foreground border rounded-lg p-3 space-y-1">
        <p className="font-medium text-foreground">Scoring</p>
        <p>• Exact score = 3 pts</p>
        <p>• Correct outcome (1X2) = 1 pt</p>
        <p>• Wrong = 0 pts</p>
      </div>
    </div>
  );
}
