import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/generated/prisma/client";

export type ScoringResult = {
  points: number;
  exactScore: boolean;
  correctOutcome: boolean;
  qualifierBonus: boolean;
  consolation: boolean;
};

type MatchData = {
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  isKnockout: boolean;
  status: MatchStatus;
};

type PredictionData = {
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  predictedQualifierId: string | null;
};

/**
 * Pure scoring logic — no DB access.
 * Returns a ScoringResult with points and breakdown booleans.
 *
 * ALL MATCHES (group stage and knockout) use the same rules:
 *   - Exact 90-min score = 3 pts
 *   - Correct 90-min outcome (1X2) = 1 pt
 *   - Wrong = 0 pts
 *   Maximum = 3 pts
 */
export function calculatePredictionPoints(
  prediction: PredictionData,
  match: MatchData
): ScoringResult {
  const zero: ScoringResult = {
    points: 0,
    exactScore: false,
    correctOutcome: false,
    qualifierBonus: false,
    consolation: false,
  };

  if (match.status !== MatchStatus.FINISHED) return zero;
  if (match.homeScore === null || match.awayScore === null) return zero;

  const { predictedHomeGoals: pH, predictedAwayGoals: pA } = prediction;
  const { homeScore: rH, awayScore: rA } = match;

  const predictedOutcome = pH > pA ? "H" : pH < pA ? "A" : "D";
  const realOutcome = rH > rA ? "H" : rH < rA ? "A" : "D";
  const isExactScore = pH === rH && pA === rA;
  const isCorrectOutcome = predictedOutcome === realOutcome;

  if (isExactScore) {
    return { points: 3, exactScore: true, correctOutcome: true, qualifierBonus: false, consolation: false };
  }
  if (isCorrectOutcome) {
    return { points: 1, exactScore: false, correctOutcome: true, qualifierBonus: false, consolation: false };
  }
  return zero;
}

/**
 * Recalculate and persist scoring for all predictions on a single match.
 * Idempotent — safe to run multiple times.
 */
export async function recalculateMatchPoints(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      winnerTeamId: true,
      homeTeamId: true,
      awayTeamId: true,
      isKnockout: true,
      status: true,
    },
  });

  if (!match || match.status !== MatchStatus.FINISHED) return;

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: {
      id: true,
      predictedHomeGoals: true,
      predictedAwayGoals: true,
      predictedQualifierId: true,
    },
  });

  await Promise.all(
    predictions.map((pred) => {
      const result = calculatePredictionPoints(pred, match as MatchData);
      return prisma.prediction.update({
        where: { id: pred.id },
        data: {
          points: result.points,
          exactScore: result.exactScore,
          correctOutcome: result.correctOutcome,
          qualifierBonus: result.qualifierBonus,
          consolation: result.consolation,
        },
      });
    })
  );
}

/**
 * Recalculate all finished matches. Idempotent.
 */
export async function recalculateAllPoints(): Promise<void> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: MatchStatus.FINISHED },
    select: { id: true },
  });

  for (const match of finishedMatches) {
    await recalculateMatchPoints(match.id);
  }
}

/**
 * Recalculate recently finished matches (last 48h). Used by cron.
 */
export async function recalculateRecentMatchPoints(): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINISHED,
      utcDate: { gte: cutoff },
    },
    select: { id: true },
  });

  for (const match of recentMatches) {
    await recalculateMatchPoints(match.id);
  }
}

/**
 * Recalculate specific matches by ID list.
 */
export async function recalculateMatchPointsByIds(
  matchIds: string[]
): Promise<void> {
  for (const matchId of matchIds) {
    await recalculateMatchPoints(matchId);
  }
}
