import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";

const BASE_URL = "https://api.football-data.org/v4";

async function probe(path: string, apiKey: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
  return { status: res.status, path, body };
}

export async function GET() {
  try {
    await requireAdmin();
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
    }

    const results = await Promise.all([
      probe("/competitions/WC/matches?season=2026", apiKey),
      probe("/competitions/WC/matches?season=2025", apiKey),
      probe("/competitions/WC/matches", apiKey),
      probe("/competitions/WC", apiKey),
    ]);

    return NextResponse.json({ apiKeyPrefix: apiKey.slice(0, 6) + "...", results });
  } catch (err) {
    return handleAdminError(err);
  }
}
