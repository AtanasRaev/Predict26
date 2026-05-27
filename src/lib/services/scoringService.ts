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
 * KNOCKOUT RULES (max 4 pts):
 *   - Exact 90-min score = 3 pts
 *   - Correct 90-min outcome (decisive) = 1 pt
 *   - If real result was draw AND user predicted draw AND correct qualifier = +1
 *   - If user predicted decisive winner and 90-min was wrong, but that team
 *     ultimately qualifies (ET/pens) = 1 consolation (never stacks on correct)
 *
 * GROUP STAGE RULES:
 *   - Exact = 3, Correct outcome = 1, Wrong = 0
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

  const { predictedHomeGoals: pH, predictedAwayGoals: pA, predictedQualifierId: pQual } = prediction;
  const { homeScore: rH, awayScore: rA, winnerTeamId, homeTeamId, awayTeamId, isKnockout } = match;

  const predictedOutcome = pH > pA ? "H" : pH < pA ? "A" : "D";
  const realOutcome = rH > rA ? "H" : rH < rA ? "A" : "D";
  const isExactScore = pH === rH && pA === rA;
  const isCorrectOutcome = predictedOutcome === realOutcome;

  // ── GROUP STAGE ──────────────────────────────────────────────────────────
  if (!isKnockout) {
    if (isExactScore) {
      return { points: 3, exactScore: true, correctOutcome: true, qualifierBonus: false, consolation: false };
    }
    if (isCorrectOutcome) {
      return { points: 1, exactScore: false, correctOutcome: true, qualifierBonus: false, consolation: false };
    }
    return zero;
  }

  // ── KNOCKOUT STAGE ───────────────────────────────────────────────────────
  let points = 0;
  let exactScore = false;
  let correctOutcome = false;
  let qualifierBonus = false;
  let consolation = false;

  if (isExactScore) {
    points += 3;
    exactScore = true;
    correctOutcome = true;
  } else if (isCorrectOutcome && realOutcome !== "D") {
    // Correct decisive 90-min outcome (not exact)
    points += 1;
    correctOutcome = true;
  } else if (isCorrectOutcome && realOutcome === "D") {
    // Both predicted and actual were draw
    points += 1;
    correctOutcome = true;
  }

  // Qualifier bonus: only when BOTH real result and prediction were draw
  // AND the user's qualifier pick is correct
  if (realOutcome === "D" && predictedOutcome === "D" && pQual && pQual === winnerTeamId) {
    points += 1;
    qualifierBonus = true;
  }

  // Consolation: only when points so far = 0 (outcome was wrong)
  // User predicted decisive winner, but 90-min was a different result,
  // yet that predicted winner still qualifies
  if (points === 0 && predictedOutcome !== "D") {
    const predictedWinnerId =
      predictedOutcome === "H" ? homeTeamId : awayTeamId;
    if (predictedWinnerId === winnerTeamId) {
      points += 1;
      consolation = true;
    }
  }

  return { points, exactScore, correctOutcome, qualifierBonus, consolation };
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
