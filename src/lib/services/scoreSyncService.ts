import { prisma } from "@/lib/prisma";
import { fetchMatchesByDateRange } from "@/lib/football-data/client";
import { mapStatus } from "@/lib/football-data/mappers";
import { withSyncLog, getLastSuccessfulSync } from "./syncLogger";

const SCORE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const LIVE_COOLDOWN_MS = 5 * 60 * 1000;   // 5 minutes during live matches

export interface ScoreSyncResult {
  synced: number;
  skipped: boolean;
  reason?: string;
  newlyFinishedMatchIds: string[];
}

async function hasLiveMatches(): Promise<boolean> {
  const count = await prisma.match.count({ where: { status: "LIVE" } });
  return count > 0;
}

export async function syncRecentScores(
  forceBypass = false
): Promise<ScoreSyncResult> {
  if (!forceBypass) {
    const isLive = await hasLiveMatches();
    const cooldown = isLive ? LIVE_COOLDOWN_MS : SCORE_COOLDOWN_MS;

    const lastSync = await getLastSuccessfulSync("SCORES");
    if (lastSync?.finishedAt) {
      const msSince = Date.now() - lastSync.finishedAt.getTime();
      if (msSince < cooldown) {
        const secondsLeft = Math.ceil((cooldown - msSince) / 1000);
        return {
          synced: 0,
          skipped: true,
          reason: `Cooldown active — ${secondsLeft}s remaining`,
          newlyFinishedMatchIds: [],
        };
      }
    }
  }

  return withSyncLog("SCORES", async (incrementRequests) => {
    const now = new Date();
    // Fetch last 48h + next 24h
    const dateFrom = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dateTo = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const data = await fetchMatchesByDateRange("SA", dateFrom, dateTo); // TEST MODE — revert to "WC"
    incrementRequests();

    let synced = 0;
    const newlyFinishedMatchIds: string[] = [];

    for (const fdMatch of data.matches) {
      const newStatus = mapStatus(fdMatch.status);

      // Check current match status before update
      const existingMatch = await prisma.match.findUnique({
        where: { externalMatchId: String(fdMatch.id) },
        select: { id: true, status: true },
      });

      if (!existingMatch) continue;

      // Detect status transition to FINISHED
      const wasNotFinished = existingMatch.status !== "FINISHED";
      const isNowFinished = newStatus === "FINISHED";

      // Determine winner
      let winnerTeamId: string | null = null;
      if (fdMatch.score.winner === "HOME_TEAM" || fdMatch.score.winner === "AWAY_TEAM") {
        const teamExternalId =
          fdMatch.score.winner === "HOME_TEAM"
            ? fdMatch.homeTeam.id
            : fdMatch.awayTeam.id;
        if (!teamExternalId) continue;
        const team = await prisma.team.findUnique({
          where: { externalId: teamExternalId },
          select: { id: true },
        });
        winnerTeamId = team?.id ?? null;
      }

      await prisma.match.update({
        where: { id: existingMatch.id },
        data: {
          status: newStatus,
          homeScore: fdMatch.score.fullTime.home,
          awayScore: fdMatch.score.fullTime.away,
          winnerTeamId,
          lastSyncedAt: new Date(),
        },
      });

      if (wasNotFinished && isNowFinished) {
        newlyFinishedMatchIds.push(existingMatch.id);
      }

      synced++;
    }

    return {
      synced,
      skipped: false,
      newlyFinishedMatchIds,
    };
  });
}
