import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { syncFixtures } from "@/lib/services/fixtureSyncService";

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncFixtures(true); // forceBypass = admin always allowed
    return NextResponse.json(result);
  } catch (err) {
    return handleAdminError(err);
  }
}
