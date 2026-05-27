import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/matches/MatchCard";
import { getPredictionStatus } from "@/lib/utils/predictionVisibility";

async function getFixtures(userId: string) {
  const matches = await prisma.match.findMany({
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

  // Group by stage
  const stageOrder: Record<string, number> = {
    GROUP_STAGE: 1,
    ROUND_OF_32: 2,
    ROUND_OF_16: 3,
    QUARTER_FINALS: 4,
    SEMI_FINALS: 5,
    THIRD_PLACE: 6,
    FINAL: 7,
  };

  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const stage = match.stage;
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(match);
  }

  return Array.from(grouped.entries()).sort(
    ([a], [b]) => (stageOrder[a] ?? 99) - (stageOrder[b] ?? 99)
  );
}

function stageLabel(stage: string, firstMatch?: { group?: string | null }) {
  if (stage === "GROUP_STAGE" && firstMatch?.group) return `Group Stage`;
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

export default async function FixturesPage() {
  const session = await auth();
  if (!session) return null;

  const grouped = await getFixtures(session.user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fixtures</h1>
      {grouped.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No fixtures loaded yet. Ask an admin to sync fixtures.
        </p>
      )}

      <div className="space-y-8">
        {grouped.map(([stage, matches]) => (
          <section key={stage}>
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">
              {stageLabel(stage, matches[0])}
            </h2>
            <div className="space-y-3">
              {matches.map((match) => {
                const userPrediction = match.predictions[0] ?? null;
                const predStatus = getPredictionStatus(
                  !!userPrediction,
                  match.utcDate
                );
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
    </div>
  );
}
