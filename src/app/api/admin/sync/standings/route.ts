import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";
import { syncStandings } from "@/lib/services/standingsSyncService";

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncStandings(true); // admin bypass
    return NextResponse.json(result);
  } catch (err) {
    return handleAdminError(err);
  }
}
