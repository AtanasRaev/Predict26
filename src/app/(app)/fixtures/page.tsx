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

const stageOrder: Record<string, number> = {
  GROUP_STAGE: 1,
  ROUND_OF_32: 2,
  ROUND_OF_16: 3,
  QUARTER_FINALS: 4,
  SEMI_FINALS: 5,
  THIRD_PLACE: 6,
  FINAL: 7,
};

const stageAccent: Record<string, string> = {
  GROUP_STAGE: "bg-blue-400",
  ROUND_OF_32: "bg-violet-400",
  ROUND_OF_16: "bg-indigo-400",
  QUARTER_FINALS: "bg-amber-400",
  SEMI_FINALS: "bg-orange-400",
  THIRD_PLACE: "bg-rose-400",
  FINAL: "bg-yellow-400",
};

function stageLabel(stage: string, firstMatch?: { group?: string | null }) {
  if (stage === "GROUP_STAGE" && firstMatch?.group) return "Group Stage";
  const labels: Record<string, string> = {
    GROUP_STAGE: "Group Stage",
    ROUND_OF_32: "Round of 32",
    ROUND_OF_16: "Round of 16",
    QUARTER_FINALS: "Quarter-Finals",
    SEMI_FINALS: "Semi-Finals",
    THIRD_PLACE: "Third Place",
    FINAL: "Final",
  };
  return labels[stage] ?? stage.replace(/_/g, " ");
}

function groupByStage<T extends { stage: string }>(matches: T[]) {
  const grouped = new Map<string, T[]>();
  for (const match of matches) {
    if (!grouped.has(match.stage)) grouped.set(match.stage, []);
    grouped.get(match.stage)!.push(match);
  }
  return Array.from(grouped.entries()).sort(
    ([a], [b]) => (stageOrder[a] ?? 99) - (stageOrder[b] ?? 99)
  );
}

async function getAllMatches(userId: string) {
  return prisma.match.findMany({
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

  // Fetch all matches once, then slice for each filter
  const all = await getAllMatches(session.user.id);
  const now = new Date();

  const today    = all.filter((m) => isMatchToday(m.utcDate));
  const upcoming = all.filter((m) => m.status === "SCHEDULED" && new Date(m.utcDate) > now);
  const past     = [...all.filter((m) => m.status === "FINISHED")].reverse(); // newest first

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
  const grouped = groupByStage(matches);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <FixtureFilters current={filter} counts={counts} />
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-center py-12 border rounded-lg">
          {EMPTY_MESSAGES[filter]}
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([stage, stageMatches]) => (
            <section key={stage}>
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2.5 pb-2 border-b">
                <span className={`w-2 h-2 rounded-full ${stageAccent[stage] ?? "bg-primary"} shrink-0`} />
                {stageLabel(stage, stageMatches[0])}
                <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                  · {stageMatches.length} match{stageMatches.length !== 1 ? "es" : ""}
                </span>
              </h2>
              <div className="space-y-3">
                {stageMatches.map((match) => {
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
