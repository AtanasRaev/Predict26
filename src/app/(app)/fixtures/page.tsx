import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/matches/MatchCard";
import { getPredictionStatus, isMatchToday } from "@/lib/utils/predictionVisibility";
import { FixtureFilters, type FilterValue } from "@/components/fixtures/FixtureFilters";

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

function parseFilter(raw?: string): FilterValue {
  if (raw === "today" || raw === "upcoming" || raw === "past") return raw;
  return "all";
}

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

function groupByDate<T extends { utcDate: Date }>(
  matches: T[],
  newestFirst = false
): [string, T[]][] {
  const grouped = new Map<string, T[]>();
  for (const match of matches) {
    const key = bostonDateKey(new Date(match.utcDate));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }
  return Array.from(grouped.entries()).sort(([a], [b]) =>
    newestFirst ? b.localeCompare(a) : a.localeCompare(b)
  );
}

async function getAllMatches(userId: string) {
  return prisma.match.findMany({
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
}

const EMPTY_MESSAGES: Record<FilterValue, string> = {
  all: "No fixtures loaded yet. Ask an admin to sync fixtures.",
  today: "No matches scheduled for today.",
  upcoming: "No upcoming matches.",
  past: "No finished matches yet.",
};

export default async function FixturesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) return null;

  const { filter: filterParam } = await searchParams;
  const filter = parseFilter(filterParam);

  const all = await getAllMatches(session.user.id);
  const now = new Date();

  const today = all.filter((m) => isMatchToday(m.utcDate));
  const upcoming = all.filter((m) => m.status === "SCHEDULED" && new Date(m.utcDate) > now);
  const past = all.filter((m) => m.status === "FINISHED");

  const counts: Partial<Record<FilterValue, number>> = {
    all: all.length,
    today: today.length,
    upcoming: upcoming.length,
    past: past.length,
  };

  const matchesForFilter: Record<FilterValue, typeof all> = {
    all,
    today,
    upcoming,
    past,
  };

  const matches = matchesForFilter[filter];
  const grouped = groupByDate(matches, filter === "past");

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Match center
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Fixtures</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse every match and lock predictions before kickoff.
          </p>
        </div>
        <FixtureFilters current={filter} counts={counts} />
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card/75 py-12 text-center text-muted-foreground">
          {EMPTY_MESSAGES[filter]}
        </p>
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
                  {dayMatches.length} match{dayMatches.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {dayMatches.map((match) => {
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
