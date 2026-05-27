import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/generated/prisma/client";
import { getPredictionLockTime } from "@/lib/constants";

export type MatchWithTeams = Awaited<
  ReturnType<typeof getMatchById>
>;

/** Get a single match with teams and all predictions */
export async function getMatchById(id: string, userId?: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      winnerTeam: true,
      predictions: {
        include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Get all matches grouped by stage */
export async function getMatchesGrouped(userId?: string) {
  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: userId
        ? {
            where: { userId },
            select: { id: true, predictedHomeGoals: true, predictedAwayGoals: true, points: true },
          }
        : false,
      _count: { select: { predictions: true } },
    },
    orderBy: [{ utcDate: "asc" }],
  });

  // Group by stage
  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const stage = match.stage;
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(match);
  }

  return grouped;
}

/** Get upcoming matches (not yet locked) */
export async function getUpcomingMatches(limit = 5, userId?: string) {
  const lockCutoff = getPredictionLockTime(new Date(Date.now() + 10_000)); // buffer
  return prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.SCHEDULED] },
      utcDate: { gt: new Date() },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: userId
        ? { where: { userId }, select: { id: true } }
        : false,
    },
    orderBy: { utcDate: "asc" },
    take: limit,
  });
}

/** Count how many upcoming (unlocked) matches a user has no prediction for */
export async function getMissingPredictionCount(userId: string): Promise<number> {
  const now = new Date();
  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      utcDate: { gt: new Date(now.getTime() + 60_000) }, // not locked yet
    },
    include: {
      predictions: { where: { userId }, select: { id: true } },
    },
  });

  return upcomingMatches.filter((m) => m.predictions.length === 0).length;
}

/** Get all matches for a specific stage */
export async function getMatchesByStage(stage: string) {
  return prisma.match.findMany({
    where: { stage },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { utcDate: "asc" },
  });
}

/** Get today's matches (within current UTC day) */
export async function getTodayMatches() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  return prisma.match.findMany({
    where: {
      utcDate: { gte: startOfDay, lte: endOfDay },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { utcDate: "asc" },
  });
}
