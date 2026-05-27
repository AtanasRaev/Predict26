import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/queries/leaderboard";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leaderboard = await getLeaderboard();
  return NextResponse.json(leaderboard);
}
