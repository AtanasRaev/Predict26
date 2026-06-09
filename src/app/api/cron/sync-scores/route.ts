import { NextRequest, NextResponse } from "next/server";
import { isWithinTournamentWindow } from "@/lib/constants";
import { syncRecentScores } from "@/lib/services/scoreSyncService";
import { syncStandings } from "@/lib/services/standingsSyncService";
import { recalculateMatchPointsByIds } from "@/lib/services/scoringService";
import { sendPredictionOpenedNotifications, sendPredictionReminders } from "@/lib/services/notificationService";
import { broadcast } from "@/lib/events/broadcaster";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [openedResult, reminderResult] = await Promise.all([
      sendPredictionOpenedNotifications(),
      sendPredictionReminders(),
    ]);

    // Scores only need tournament-window calls. Prediction-open notifications can be due earlier.
    if (!isWithinTournamentWindow()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Outside tournament window (2026-06-11 to 2026-07-19)",
        notifications: { opened: openedResult, reminder: reminderResult },
      });
    }

    const scoreResult = await syncRecentScores();

    if (!scoreResult.skipped) {
      if (scoreResult.newlyFinishedMatchIds.length > 0) {
        await syncStandings(true);
        await recalculateMatchPointsByIds(scoreResult.newlyFinishedMatchIds);
      } else {
        const { recalculateRecentMatchPoints } = await import(
          "@/lib/services/scoringService"
        );
        await recalculateRecentMatchPoints();
      }

      broadcast("refresh", { reason: "cron-scores" });
    } else {
      broadcast("refresh", { reason: "cron-notifications" });
    }

    return NextResponse.json({
      ok: true,
      synced: scoreResult.synced,
      skipped: scoreResult.skipped,
      reason: scoreResult.reason,
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
