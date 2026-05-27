import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPredictionLockTime } from "@/lib/constants";
import { z } from "zod";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  predictedHomeGoals: z.number().int().min(0).max(30),
  predictedAwayGoals: z.number().int().min(0).max(30),
  predictedQualifierId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = predictionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { matchId, predictedHomeGoals, predictedAwayGoals, predictedQualifierId } =
    parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, utcDate: true, isKnockout: true, status: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Server-side lock: reject if past the lock time (kickoff - 60s)
  const lockTime = getPredictionLockTime(match.utcDate);
  if (new Date() >= lockTime) {
    return NextResponse.json(
      { error: "Prediction window is closed for this match" },
      { status: 403 }
    );
  }

  // Validate qualifier: required for knockout draws
  const isPredictedDraw = predictedHomeGoals === predictedAwayGoals;
  if (match.isKnockout && isPredictedDraw && !predictedQualifierId) {
    return NextResponse.json(
      { error: "You must select a qualifier for knockout draw predictions" },
      { status: 400 }
    );
  }

  // Clear qualifier for non-draw predictions (or non-knockout)
  const qualifierId =
    match.isKnockout && isPredictedDraw ? (predictedQualifierId ?? null) : null;

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchId: { userId: session.user.id, matchId: match.id },
    },
    create: {
      userId: session.user.id,
      matchId: match.id,
      predictedHomeGoals,
      predictedAwayGoals,
      predictedQualifierId: qualifierId,
    },
    update: {
      predictedHomeGoals,
      predictedAwayGoals,
      predictedQualifierId: qualifierId,
    },
    select: {
      id: true,
      matchId: true,
      predictedHomeGoals: true,
      predictedAwayGoals: true,
      predictedQualifierId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(prediction);
}
