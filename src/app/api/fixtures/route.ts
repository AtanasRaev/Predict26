import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      winnerTeam: true,
      predictions: {
        where: { userId: session.user.id },
        select: {
          id: true,
          predictedHomeGoals: true,
          predictedAwayGoals: true,
          points: true,
          lockedAt: true,
        },
      },
      _count: { select: { predictions: true } },
    },
    orderBy: { utcDate: "asc" },
  });

  return NextResponse.json(matches);
}
