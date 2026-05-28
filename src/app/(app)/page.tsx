import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MatchCard } from "@/components/matches/MatchCard";
import { getLeaderboard } from "@/lib/queries/leaderboard";
import { getMissingPredictionCount } from "@/lib/queries/matches";
import { getPredictionStatus } from "@/lib/utils/predictionVisibility";
import { Trophy, AlertTriangle, Target, Star, BarChart3 } from "lucide-react";
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
    {
      label: "My Rank",
      value: myRank ? `#${myRank}` : "—",
      icon: Trophy,
      iconColor: "text-yellow-400",
      valueColor: "text-yellow-400",
      borderColor: "border-l-yellow-400",
      bg: "bg-yellow-400/5",
    },
    {
      label: "Total Points",
      value: myStats._sum.points ?? 0,
      icon: Star,
      iconColor: "text-blue-400",
      valueColor: "text-blue-400",
      borderColor: "border-l-blue-400",
      bg: "bg-blue-400/5",
    },
    {
      label: "Exact Scores",
      value: exactCount,
      icon: Target,
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
      borderColor: "border-l-emerald-400",
      bg: "bg-emerald-400/5",
    },
    {
      label: "Predictions",
      value: myStats._count.id,
      icon: BarChart3,
      iconColor: "text-violet-400",
      valueColor: "text-violet-400",
      borderColor: "border-l-violet-400",
      bg: "bg-violet-400/5",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.username} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          World Cup 2026 Predictions
        </p>
      </div>

      {/* Missing predictions alert */}
      {missingCount > 0 && (
        <Alert className="border-orange-400/30 bg-orange-400/5">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have <strong>{missingCount}</strong> upcoming{" "}
              {missingCount === 1 ? "match" : "matches"} without a prediction today.
            </span>
            <Button asChild size="sm" variant="outline" className="ml-3 shrink-0 border-orange-400/30 text-orange-400 hover:bg-orange-400/10">
              <Link href="/fixtures">Predict now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, iconColor, valueColor, borderColor, bg }) => (
          <div
            key={label}
            className={`border border-l-4 ${borderColor} rounded-lg p-4 ${bg} bg-card flex flex-col items-center gap-1`}
          >
            <Icon className={`h-4 w-4 ${iconColor} mb-0.5`} />
            <div className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
            <div className="text-xs text-muted-foreground text-center leading-tight">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming matches */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-primary inline-block" />
              Upcoming Matches
            </h2>
            <Link href="/fixtures" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center border rounded-lg">
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

        {/* Top 5 leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-yellow-400 inline-block" />
              Top 5
            </h2>
            <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
              Full leaderboard
            </Link>
          </div>
          <div className="border rounded-lg bg-card overflow-hidden">
            {top5.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                No scores yet
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {top5.map((entry) => {
                    const isCurrentUser = entry.userId === session.user.id;
                    const medal =
                      entry.rank === 1
                        ? "🥇"
                        : entry.rank === 2
                        ? "🥈"
                        : entry.rank === 3
                        ? "🥉"
                        : entry.rank;
                    return (
                      <tr
                        key={entry.userId}
                        className={
                          isCurrentUser
                            ? "bg-primary/8 font-semibold"
                            : entry.rank <= 3
                            ? "hover:bg-muted/30"
                            : "hover:bg-muted/20"
                        }
                      >
                        <td className="px-4 py-2.5 w-10 text-center text-base">{medal}</td>
                        <td className="py-2.5">
                          {entry.username}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">
                              (you)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-primary">
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
