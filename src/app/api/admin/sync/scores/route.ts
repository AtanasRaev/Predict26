import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { syncRecentScores } from "@/lib/services/scoreSyncService";
import { syncStandings } from "@/lib/services/standingsSyncService";
import { recalculateMatchPointsByIds } from "@/lib/services/scoringService";

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncRecentScores(true); // admin bypass

    // If any matches just finished, sync standings and recalculate
    if (result.newlyFinishedMatchIds.length > 0) {
      await syncStandings(true);
      await recalculateMatchPointsByIds(result.newlyFinishedMatchIds);
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleAdminError(err);
  }
}
