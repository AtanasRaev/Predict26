import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/clear-data
 * Wipes all match data (predictions, matches, standings, teams) from the DB.
 * Leaves users and sync logs intact.
 * Admin-only. Used when swapping competitions for testing.
 */
export async function DELETE() {
  try {
    await requireAdmin();

    // Order matters — delete dependents before parents
    const [predictions, standings, matches, teams] = await prisma.$transaction([
      prisma.prediction.deleteMany(),
      prisma.standing.deleteMany(),
      prisma.match.deleteMany(),
      prisma.team.deleteMany(),
    ]);

    return NextResponse.json({
      ok: true,
      deleted: {
        predictions: predictions.count,
        standings: standings.count,
        matches: matches.count,
        teams: teams.count,
      },
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
