import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { recalculateAllPoints } from "@/lib/services/scoringService";

export async function POST() {
  try {
    await requireAdmin();
    await recalculateAllPoints();
    return NextResponse.json({ ok: true, message: "All points recalculated" });
  } catch (err) {
    return handleAdminError(err);
  }
}
