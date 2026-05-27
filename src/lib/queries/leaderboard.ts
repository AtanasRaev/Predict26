import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  exactScoreCount: number;
  correctOutcomeCount: number;
  submittedCount: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Aggregate directly from Prediction boolean columns
  const users = await prisma.user.findMany({
    include: {
      predictions: {
        select: {
          points: true,
          exactScore: true,
          correctOutcome: true,
          matchId: true,
          match: { select: { status: true } },
        },
      },
    },
    orderBy: { username: "asc" },
  });

  const entries: Omit<LeaderboardEntry, "rank">[] = users.map((user) => {
    // Only score predictions where the match is finished
    const scoredPredictions = user.predictions.filter(
      (p) => p.match.status === "FINISHED" && p.points !== null
    );

    const totalPoints = scoredPredictions.reduce(
      (sum, p) => sum + (p.points ?? 0),
      0
    );
    const exactScoreCount = scoredPredictions.filter(
      (p) => p.exactScore === true
    ).length;
    const correctOutcomeCount = scoredPredictions.filter(
      (p) => p.correctOutcome === true
    ).length;
    const submittedCount = user.predictions.length;

    return {
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      totalPoints,
      exactScoreCount,
      correctOutcomeCount,
      submittedCount,
    };
  });

  // Sort with tiebreakers
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScoreCount !== a.exactScoreCount)
      return b.exactScoreCount - a.exactScoreCount;
    if (b.correctOutcomeCount !== a.correctOutcomeCount)
      return b.correctOutcomeCount - a.correctOutcomeCount;
    if (b.submittedCount !== a.submittedCount)
      return b.submittedCount - a.submittedCount;
    // Final tiebreaker: username alphabetical
    return a.username.localeCompare(b.username);
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Leaderboard limited to group-stage matches only */
export async function getGroupStageLeaderboard(): Promise<LeaderboardEntry[]> {
  const users = await prisma.user.findMany({
    include: {
      predictions: {
        where: { match: { isKnockout: false, status: "FINISHED" } },
        select: { points: true, exactScore: true, correctOutcome: true },
      },
    },
    orderBy: { username: "asc" },
  });

  const entries = users.map((user) => ({
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    totalPoints: user.predictions.reduce((s, p) => s + (p.points ?? 0), 0),
    exactScoreCount: user.predictions.filter((p) => p.exactScore).length,
    correctOutcomeCount: user.predictions.filter((p) => p.correctOutcome).length,
    submittedCount: user.predictions.length,
  }));

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScoreCount !== a.exactScoreCount) return b.exactScoreCount - a.exactScoreCount;
    if (b.correctOutcomeCount !== a.correctOutcomeCount) return b.correctOutcomeCount - a.correctOutcomeCount;
    if (b.submittedCount !== a.submittedCount) return b.submittedCount - a.submittedCount;
    return a.username.localeCompare(b.username);
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
