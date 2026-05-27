import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { prisma } from "@/lib/prisma";
import { recalculateMatchPoints } from "@/lib/services/scoringService";
import { z } from "zod";

const updateMatchSchema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  status: z
    .enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"])
    .optional(),
  winnerTeamId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: parsed.data,
      include: { homeTeam: true, awayTeam: true, winnerTeam: true },
    });

    // Auto-recalculate if match is now FINISHED
    if (updatedMatch.status === "FINISHED") {
      await recalculateMatchPoints(id);
    }

    return NextResponse.json(updatedMatch);
  } catch (err) {
    return handleAdminError(err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true,
        predictions: {
          include: {
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (err) {
    return handleAdminError(err);
  }
}
