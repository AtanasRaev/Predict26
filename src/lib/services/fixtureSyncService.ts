import { prisma } from "@/lib/prisma";
import { fetchMatches } from "@/lib/football-data/client";
import { mapStatus, isKnockoutStage } from "@/lib/football-data/mappers";
import { withSyncLog, getLastSuccessfulSync } from "./syncLogger";

const FIXTURE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface FixtureSyncResult {
  synced: number;
  skipped: boolean;
  reason?: string;
}

export async function syncFixtures(
  forceBypass = false
): Promise<FixtureSyncResult> {
  if (!forceBypass) {
    const lastSync = await getLastSuccessfulSync("FIXTURES");
    if (lastSync?.finishedAt) {
      const msSince = Date.now() - lastSync.finishedAt.getTime();
      if (msSince < FIXTURE_COOLDOWN_MS) {
        const minutesLeft = Math.ceil(
          (FIXTURE_COOLDOWN_MS - msSince) / 60_000
        );
        return {
          synced: 0,
          skipped: true,
          reason: `Cooldown active — ${minutesLeft} minutes remaining`,
        };
      }
    }
  }

  return withSyncLog("FIXTURES", async (incrementRequests) => {
    const data = await fetchMatches("BSA", 2026); // TEST MODE — revert to ("WC", 2026)
    incrementRequests();

    let synced = 0;

    for (const fdMatch of data.matches) {
      // Skip TBD / placeholder matches where teams aren't assigned yet
      if (!fdMatch.homeTeam?.id || !fdMatch.awayTeam?.id) continue;

      const homeShortName =
        fdMatch.homeTeam.shortName || fdMatch.homeTeam.tla || fdMatch.homeTeam.name || "TBD";
      const awayShortName =
        fdMatch.awayTeam.shortName || fdMatch.awayTeam.tla || fdMatch.awayTeam.name || "TBD";
      const homeCrest = fdMatch.homeTeam.crest ?? "";
      const awayCrest = fdMatch.awayTeam.crest ?? "";

      // Upsert home team
      await prisma.team.upsert({
        where: { externalId: fdMatch.homeTeam.id },
        create: {
          externalId: fdMatch.homeTeam.id,
          name: fdMatch.homeTeam.name,
          shortName: homeShortName,
          crestUrl: homeCrest,
          groupId: fdMatch.group ?? null,
        },
        update: {
          name: fdMatch.homeTeam.name,
          shortName: homeShortName,
          crestUrl: homeCrest,
        },
      });

      // Upsert away team
      await prisma.team.upsert({
        where: { externalId: fdMatch.awayTeam.id },
        create: {
          externalId: fdMatch.awayTeam.id,
          name: fdMatch.awayTeam.name,
          shortName: awayShortName,
          crestUrl: awayCrest,
          groupId: fdMatch.group ?? null,
        },
        update: {
          name: fdMatch.awayTeam.name,
          shortName: awayShortName,
          crestUrl: awayCrest,
        },
      });

      // Fetch local team IDs
      const [homeTeam, awayTeam] = await Promise.all([
        prisma.team.findUnique({ where: { externalId: fdMatch.homeTeam.id } }),
        prisma.team.findUnique({ where: { externalId: fdMatch.awayTeam.id } }),
      ]);

      if (!homeTeam || !awayTeam) continue;

      const status = mapStatus(fdMatch.status);
      const knockout = isKnockoutStage(fdMatch.stage);

      // Determine winner team ID if available
      let winnerTeamId: string | null = null;
      if (fdMatch.score.winner === "HOME_TEAM") winnerTeamId = homeTeam.id;
      else if (fdMatch.score.winner === "AWAY_TEAM") winnerTeamId = awayTeam.id;

      await prisma.match.upsert({
        where: { externalMatchId: String(fdMatch.id) },
        create: {
          externalMatchId: String(fdMatch.id),
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          utcDate: new Date(fdMatch.utcDate),
          stage: fdMatch.stage,
          group: fdMatch.group ?? null,
          status,
          homeScore: fdMatch.score.fullTime.home,
          awayScore: fdMatch.score.fullTime.away,
          winnerTeamId,
          isKnockout: knockout,
          lastSyncedAt: new Date(),
        },
        update: {
          utcDate: new Date(fdMatch.utcDate),
          stage: fdMatch.stage,
          group: fdMatch.group ?? null,
          status,
          homeScore: fdMatch.score.fullTime.home,
          awayScore: fdMatch.score.fullTime.away,
          winnerTeamId,
          isKnockout: knockout,
          lastSyncedAt: new Date(),
        },
      });

      synced++;
    }

    return { synced, skipped: false };
  });
}
