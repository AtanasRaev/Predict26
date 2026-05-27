import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { filterPredictionsForDisplay } from "@/lib/utils/predictionVisibility";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      winnerTeam: true,
      predictions: {
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Apply visibility rules
  const visiblePredictions = filterPredictionsForDisplay(
    match.predictions,
    match.utcDate,
    session.user.id
  );

  return NextResponse.json({ ...match, predictions: visiblePredictions });
}
