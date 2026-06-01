import { prisma } from "@/lib/prisma";
import { fetchStandings } from "@/lib/football-data/client";
import { FOOTBALL_DATA_COMPETITION, FOOTBALL_DATA_SEASON } from "@/lib/constants";
import { withSyncLog, getLastSuccessfulSync } from "./syncLogger";

const STANDINGS_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes

export interface StandingsSyncResult {
  synced: number;
  skipped: boolean;
  reason?: string;
}

export async function syncStandings(
  forceBypass = false
): Promise<StandingsSyncResult> {
  if (!forceBypass) {
    const lastSync = await getLastSuccessfulSync("STANDINGS");
    if (lastSync?.finishedAt) {
      const msSince = Date.now() - lastSync.finishedAt.getTime();
      if (msSince < STANDINGS_COOLDOWN_MS) {
        const minutesLeft = Math.ceil(
          (STANDINGS_COOLDOWN_MS - msSince) / 60_000
        );
        return {
          synced: 0,
          skipped: true,
          reason: `Cooldown active — ${minutesLeft} minutes remaining`,
        };
      }
    }
  }

  return withSyncLog("STANDINGS", async (incrementRequests) => {
    const data = await fetchStandings(FOOTBALL_DATA_COMPETITION, FOOTBALL_DATA_SEASON);
    incrementRequests();

    let synced = 0;

    for (const standingGroup of data.standings) {
      // Only process TOTAL type standings (skip HOME/AWAY splits)
      if (standingGroup.type !== "TOTAL") continue;
      // Use the group name if present (WC groups), or "LEAGUE" for single-table leagues
      const groupKey = standingGroup.group ?? "LEAGUE";

      for (const entry of standingGroup.table) {
        if (!entry.team?.id) continue;
        const team = await prisma.team.findUnique({
          where: { externalId: entry.team.id },
          select: { id: true },
        });

        if (!team) continue;

        await prisma.standing.upsert({
          where: {
            groupName_teamId: {
              groupName: groupKey,
              teamId: team.id,
            },
          },
          create: {
            groupName: groupKey,
            teamId: team.id,
            position: entry.position,
            played: entry.playedGames,
            won: entry.won,
            drawn: entry.draw,
            lost: entry.lost,
            goalsFor: entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            points: entry.points,
            lastSyncedAt: new Date(),
          },
          update: {
            position: entry.position,
            played: entry.playedGames,
            won: entry.won,
            drawn: entry.draw,
            lost: entry.lost,
            goalsFor: entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            points: entry.points,
            lastSyncedAt: new Date(),
          },
        });

        synced++;
      }
    }

    return { synced, skipped: false };
  });
}
