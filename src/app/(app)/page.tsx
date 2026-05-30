import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MatchCard } from "@/components/matches/MatchCard";
import { getLeaderboard } from "@/lib/queries/leaderboard";
import { getMissingPredictionCount } from "@/lib/queries/matches";
import { getPredictionStatus } from "@/lib/utils/predictionVisibility";
import { Trophy, AlertTriangle, Target, Star, BarChart3, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

async function getDashboardData(userId: string) {
  const [upcoming, leaderboard, missingCount] = await Promise.all([
    prisma.match.findMany({
      where: { status: "SCHEDULED", utcDate: { gt: new Date() } },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          where: { userId },
          select: { id: true, predictedHomeGoals: true, predictedAwayGoals: true, points: true },
        },
        _count: { select: { predictions: true } },
      },
      orderBy: { utcDate: "asc" },
      take: 5,
    }),
    getLeaderboard(),
    getMissingPredictionCount(userId),
  ]);

  const myStats = await prisma.prediction.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { points: true },
  });

  const exactCount = await prisma.prediction.count({
    where: { userId, exactScore: true },
  });

  return { upcoming, leaderboard, missingCount, myStats, exactCount };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const { upcoming, leaderboard, missingCount, myStats, exactCount } =
    await getDashboardData(session.user.id);

  const myRank = leaderboard.find((e) => e.userId === session.user.id)?.rank;
  const top5 = leaderboard.slice(0, 5);

  const stats = [
    { label: "My Rank", value: myRank ? `#${myRank}` : "-", icon: Trophy, tone: "text-accent", border: "border-accent/30", bg: "bg-accent/8" },
    { label: "Total Points", value: myStats._sum.points ?? 0, icon: Star, tone: "text-primary", border: "border-primary/30", bg: "bg-primary/8" },
    { label: "Exact Scores", value: exactCount, icon: Target, tone: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-400/8" },
    { label: "Predictions", value: myStats._count.id, icon: BarChart3, tone: "text-violet-300", border: "border-violet-400/30", bg: "bg-violet-400/8" },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-card/82 p-4 shadow-2xl shadow-black/15 sm:rounded-3xl sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              World Cup 2026 Predictions
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-4xl">
              Welcome back, {session.user.username}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Make your calls before kickoff, climb the table, and chase perfect scores.
            </p>
          </div>
          <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
            <Link href="/predict">
              Predict matches
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {missingCount > 0 && (
        <Alert className="border-accent/30 bg-accent/10">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              You have <strong>{missingCount}</strong>{" "}
              {missingCount === 1 ? "match" : "matches"} open for prediction.
            </span>
            <Button asChild size="sm" variant="outline" className="shrink-0 border-accent/30 text-accent hover:bg-accent/10">
              <Link href="/predict">Predict now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone, border, bg }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} bg-card/85 p-3 shadow-sm sm:rounded-2xl sm:p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`text-xl font-black tabular-nums sm:text-2xl ${tone}`}>{value}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-[0.14em]">
                  {label}
                </div>
              </div>
              <Icon className={`h-5 w-5 ${tone}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black sm:text-lg">
              <span className="inline-block h-5 w-1 rounded-full bg-primary" />
              Upcoming Matches
            </h2>
            <Link href="/fixtures" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-card/75 py-10 text-center text-sm text-muted-foreground">
              No upcoming matches
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((match) => {
                const userPrediction = match.predictions[0] ?? null;
                const predStatus = getPredictionStatus(!!userPrediction, match.utcDate);
                return (
                  <MatchCard
                    key={match.id}
                    id={match.id}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    utcDate={match.utcDate}
                    stage={match.stage}
                    group={match.group}
                    status={match.status}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                    isKnockout={match.isKnockout}
                    predictionCount={match._count.predictions}
                    userPrediction={userPrediction}
                    predictionStatus={predStatus}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <span className="inline-block h-5 w-1 rounded-full bg-accent" />
              Top Players
            </h2>
            <Link href="/leaderboard" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Full leaderboard
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-card/85 shadow-sm sm:rounded-2xl">
            {top5.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No scores yet</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/10">
                  {top5.map((entry) => {
                    const isCurrentUser = entry.userId === session.user.id;
                    return (
                      <tr
                        key={entry.userId}
                        className={isCurrentUser ? "bg-primary/10 font-semibold" : "hover:bg-white/[0.035]"}
                      >
                        <td className="w-12 px-4 py-3 text-center">
                          <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-xs font-black text-accent">
                            {entry.rank}
                          </span>
                        </td>
                        <td className="py-3">
                          {entry.username}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-primary">
                          {entry.totalPoints} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
