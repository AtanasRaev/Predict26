import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { prisma } from "@/lib/prisma";
import { withTransientDbRetry } from "@/lib/dbRetry";

export async function GET() {
  try {
    await requireAdmin();

    const logs = await withTransientDbRetry(() =>
      prisma.apiSyncLog.findMany({
        orderBy: { startedAt: "desc" },
        take: 20,
      })
    );

    return NextResponse.json(logs);
  } catch (err) {
    return handleAdminError(err);
  }
}
