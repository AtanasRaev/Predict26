import { NextRequest, NextResponse } from "next/server";
import { sendPredictionReminders } from "@/lib/services/notificationService";

export const runtime = "nodejs";

/**
 * GET /api/cron/notify-predictions
 *
 * This is now also called automatically by the main score-sync cron
 * (GET /api/cron/sync-scores) so no separate cron schedule is needed.
 *
 * Keep this endpoint for manual testing:
 *   curl -H "x-cron-secret: <secret>" https://yoursite.com/api/cron/notify-predictions
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPredictionReminders();
  return NextResponse.json({ ok: true, ...result });
}
