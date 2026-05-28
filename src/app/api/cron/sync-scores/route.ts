import { NextRequest, NextResponse } from "next/server";
import { isWithinTournamentWindow } from "@/lib/constants";
import { syncRecentScores } from "@/lib/services/scoreSyncService";
import { syncStandings } from "@/lib/services/standingsSyncService";
import { recalculateMatchPointsByIds } from "@/lib/services/scoringService";
import { sendPredictionReminders, sendPredictionOpenedNotifications } from "@/lib/services/notificationService";
import { broadcast } from "@/lib/events/broadcaster";

export async function GET(req: NextRequest) {
  // Validate cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip if outside tournament window
  if (!isWithinTournamentWindow()) {
    return NextResponse.json({
      skipped: true,
      reason: "Outside tournament window (2026-06-11 to 2026-07-19)",
    });
  }

  try {
    const scoreResult = await syncRecentScores();

    if (scoreResult.skipped) {
      return NextResponse.json({ skipped: true, reason: scoreResult.reason });
    }

    // If any matches just finished, sync standings and recalculate points
    if (scoreResult.newlyFinishedMatchIds.length > 0) {
      await syncStandings(true);
      await recalculateMatchPointsByIds(scoreResult.newlyFinishedMatchIds);
    } else {
      // Still recalculate recent matches in case scores were updated
      const { recalculateRecentMatchPoints } = await import(
        "@/lib/services/scoringService"
      );
      await recalculateRecentMatchPoints();
    }

    // Push live update to every connected browser tab
    broadcast("refresh", { reason: "cron-scores" });

    // Push notifications: "predictions just opened" + "1 h before lock" reminder
    // Both run in parallel — they target different matches so there's no conflict.
    const [openedResult, reminderResult] = await Promise.all([
      sendPredictionOpenedNotifications(),
      sendPredictionReminders(),
    ]);

    return NextResponse.json({
      ok: true,
      synced: scoreResult.synced,
      newlyFinished: scoreResult.newlyFinishedMatchIds.length,
      notifications: { opened: openedResult, reminder: reminderResult },
    });
  } catch (err) {
    console.error("[Cron Error]", err);
    return NextResponse.json(
      { error: "Sync failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
