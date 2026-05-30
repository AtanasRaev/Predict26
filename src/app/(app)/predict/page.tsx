import { auth } from "@/auth";
import { MatchCard } from "@/components/matches/MatchCard";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getPredictionStatus, isOpenForPrediction } from "@/lib/utils/predictionVisibility";
import { CalendarClock } from "lucide-react";
import Link from "next/link";

const TZ = "America/New_York";

const bostonDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function bostonDateKey(date: Date): string {
  return bostonDateFmt.format(new Date(date));
}

function formatDateHeader(dateKey: string): string {
  const todayKey = bostonDateKey(new Date());
  const [y, m, d] = dateKey.split("-").map(Number);
  const displayDate = new Date(Date.UTC(y, m - 1, d, 16, 0, 0));

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = bostonDateKey(tomorrowDate);

  const long = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(displayDate);

  if (dateKey === todayKey) return `Today - ${long}`;
  if (dateKey === tomorrowKey) return `Tomorrow - ${long}`;
  return long;
}

function groupByDate<T extends { utcDate: Date }>(matches: T[]): [string, T[]][] {
  const grouped = new Map<string, T[]>();
  for (const match of matches) {
    const key = bostonDateKey(match.utcDate);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
}

async function getAvailablePredictionMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      utcDate: { gt: new Date() },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { userId },
        select: {
          id: true,
          predictedHomeGoals: true,
          predictedAwayGoals: true,
          points: true,
        },
      },
      _count: { select: { predictions: true } },
    },
    orderBy: { utcDate: "asc" },
  });

  return matches.filter((match) => isOpenForPrediction(match.utcDate));
}

export default async function PredictPage() {
  const session = await auth();
  if (!session) return null;

  const matches = await getAvailablePredictionMatches(session.user.id);
  const grouped = groupByDate(matches);
  const missingCount = matches.filter((match) => match.predictions.length === 0).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Prediction window
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Available Games
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            These matches are open for predictions right now. Pick or update your score before the lock time.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-2 text-sm font-bold text-accent">
          <CalendarClock className="h-4 w-4" />
          {missingCount} left to predict
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card/75 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">
            No games are currently available for predictions.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Prediction windows open two days before match day and close shortly before kickoff.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/fixtures">View all fixtures</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-7 sm:space-y-8">
          {grouped.map(([dateKey, dayMatches]) => (
            <section key={dateKey}>
              <div className="mb-3 flex items-center gap-2 sm:gap-3">
                <h2 className="min-w-0 truncate text-sm font-black text-foreground">
                  {formatDateHeader(dateKey)}
                </h2>
                <div className="h-px flex-1 bg-white/10" />
                <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                  {dayMatches.length} open
                </span>
              </div>

              <div className="space-y-3">
                {dayMatches.map((match) => {
                  const userPrediction = match.predictions[0] ?? null;
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
                      predictionStatus={getPredictionStatus(!!userPrediction, match.utcDate)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
