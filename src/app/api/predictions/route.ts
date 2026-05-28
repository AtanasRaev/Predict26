import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPredictionLockTime } from "@/lib/constants";
import { isMatchWithinPredictionWindow } from "@/lib/utils/predictionVisibility";
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
    select: { id: true, utcDate: true, status: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Server-side: only allow predictions within the prediction window
  if (!isMatchWithinPredictionWindow(match.utcDate)) {
    return NextResponse.json(
      { error: "Predictions are not open yet for this match" },
      { status: 403 }
    );
  }

  // Server-side lock: reject if past the lock time (kickoff - 60s)
  const lockTime = getPredictionLockTime(match.utcDate);
  if (new Date() >= lockTime) {
    return NextResponse.json(
      { error: "Prediction window is closed for this match" },
      { status: 403 }
    );
  }

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchId: { userId: session.user.id, matchId: match.id },
    },
    create: {
      userId: session.user.id,
      matchId: match.id,
      predictedHomeGoals,
      predictedAwayGoals,
      predictedQualifierId: null,
    },
    update: {
      predictedHomeGoals,
      predictedAwayGoals,
      predictedQualifierId: null,
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
