/**
 * Push notification helpers for predictions.
 *
 * Two notifications per match:
 *   1. predictionOpenedSentAt   — sent as soon as the prediction window opens
 *                                  (cron detects match is now within 2 calendar days, ET)
 *   2. predictionReminderSentAt — sent 3 h before kickoff (= 1 h before the 2-hour lock)
 *
 * Both are idempotent — the DB flags prevent double-sending.
 */
import { prisma } from "@/lib/prisma";
import { broadcastPush } from "@/lib/services/pushService";
import { isMatchWithinPredictionWindow } from "@/lib/utils/predictionVisibility";
import { MatchStatus } from "@/generated/prisma/client";

export interface NotifyResult {
  matchesFound: number;
  sent: number;
  prunedExpired: number;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Format the prediction lock time (kickoff − 2 h) as a human-readable ET string. */
function formatLockTime(kickoff: Date): string {
  const lockTime = new Date(kickoff.getTime() - 2 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(lockTime);
}

/** Fan out a push to all active subscriptions, prune expired ones, return counts. */
async function fanOut(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; url: string },
  activeSubs: Array<{ endpoint: string; p256dh: string; auth: string }>
): Promise<{ sent: number; prunedExpired: number }> {
  if (activeSubs.length === 0) return { sent: 0, prunedExpired: 0 };

  const goneEndpoints = await broadcastPush(activeSubs, payload);

  const sent = activeSubs.length - goneEndpoints.length;
  const prunedExpired = goneEndpoints.length;

  if (goneEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: goneEndpoints } },
    });
    // Remove from activeSubs in-place so subsequent matches skip them
    for (const ep of goneEndpoints) {
      const idx = activeSubs.findIndex((s) => s.endpoint === ep);
      if (idx !== -1) activeSubs.splice(idx, 1);
    }
  }

  return { sent, prunedExpired };
}

// ---------------------------------------------------------------------------
// 1. "Predictions are now open" — sent when the window first opens
// ---------------------------------------------------------------------------

export async function sendPredictionOpenedNotifications(): Promise<NotifyResult> {
  const now = new Date();

  // Fetch SCHEDULED matches in the next ~4 days that haven't been open-notified yet.
  // We over-fetch slightly and then apply the exact calendar-day check in JS to stay
  // consistent with the UI logic (isMatchWithinPredictionWindow).
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      utcDate: { gt: now, lte: fourDaysFromNow },
      predictionOpenedSentAt: null,
    },
    include: {
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
    },
  });

  // Only keep matches that are genuinely within the prediction window right now
  const matches = candidates.filter((m) => isMatchWithinPredictionWindow(m.utcDate));

  if (matches.length === 0) return { matchesFound: 0, sent: 0, prunedExpired: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    select: { endpoint: true, p256dh: true, auth: true },
  });

  let totalSent = 0;
  let totalPruned = 0;
  const activeSubs = [...subscriptions];

  if (matches.length === 1) {
    const match = matches[0];
    const lockStr = formatLockTime(match.utcDate);

    const { sent, prunedExpired } = await fanOut(
      subscriptions,
      {
        title: `🔓 Predictions open! ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`,
        body: `Place your prediction before ${lockStr}.`,
        url: `/match/${match.id}`,
      },
      activeSubs
    );

    totalSent += sent;
    totalPruned += prunedExpired;

    await prisma.match.update({
      where: { id: match.id },
      data: { predictionOpenedSentAt: new Date() },
    });
  } else {
    const matchList = matches
      .map((m) => `${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`)
      .join(", ");

    const { sent, prunedExpired } = await fanOut(
      subscriptions,
      {
        title: `🔓 ${matches.length} matches are open for predictions!`,
        body: matchList,
        url: `/predictions`,
      },
      activeSubs
    );

    totalSent += sent;
    totalPruned += prunedExpired;

    await prisma.match.updateMany({
      where: { id: { in: matches.map((m) => m.id) } },
      data: { predictionOpenedSentAt: new Date() },
    });
  }

  return { matchesFound: matches.length, sent: totalSent, prunedExpired: totalPruned };
}

// ---------------------------------------------------------------------------
// 2. "1 hour left to predict" — sent 3 h before kickoff (1 h before lock)
// ---------------------------------------------------------------------------

const NOTIFY_ADVANCE_MS = 3 * 60 * 60 * 1000; // 3 h before kickoff
const WINDOW_MS = 20 * 60 * 1000;              // ±20 min cron tolerance

export async function sendPredictionReminders(): Promise<NotifyResult> {
  const now = Date.now();
  const windowStart = new Date(now + NOTIFY_ADVANCE_MS - WINDOW_MS);
  const windowEnd   = new Date(now + NOTIFY_ADVANCE_MS + WINDOW_MS);

  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      utcDate: { gte: windowStart, lte: windowEnd },
      predictionReminderSentAt: null,
    },
    include: {
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
    },
  });

  if (matches.length === 0) return { matchesFound: 0, sent: 0, prunedExpired: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    select: { endpoint: true, p256dh: true, auth: true },
  });

  let totalSent = 0;
  let totalPruned = 0;
  const activeSubs = [...subscriptions];

  if (matches.length === 1) {
    const match = matches[0];

    const { sent, prunedExpired } = await fanOut(
      subscriptions,
      {
        title: `⏰ Last hour! ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`,
        body: `Predictions close in 1 hour. Match kicks off in 3 hours.`,
        url: `/match/${match.id}`,
      },
      activeSubs
    );

    totalSent += sent;
    totalPruned += prunedExpired;

    await prisma.match.update({
      where: { id: match.id },
      data: { predictionReminderSentAt: new Date() },
    });
  } else {
    const matchList = matches
      .map((m) => `${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`)
      .join(", ");

    const { sent, prunedExpired } = await fanOut(
      subscriptions,
      {
        title: `⏰ Last hour! ${matches.length} matches closing soon`,
        body: matchList,
        url: `/predictions`,
      },
      activeSubs
    );

    totalSent += sent;
    totalPruned += prunedExpired;

    await prisma.match.updateMany({
      where: { id: { in: matches.map((m) => m.id) } },
      data: { predictionReminderSentAt: new Date() },
    });
  }

  return { matchesFound: matches.length, sent: totalSent, prunedExpired: totalPruned };
}
