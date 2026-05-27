import type {
  FDMatchesResponse,
  FDStandingsResponse,
} from "./types";

const BASE_URL = "https://api.football-data.org/v4";

async function apiFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (res.status === 429) {
    throw new Error("RATE_LIMITED: football-data.org rate limit reached");
  }
  if (res.status === 403) {
    throw new Error("FORBIDDEN: check your API key or plan restrictions");
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`API_ERROR:${res.status} — ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/** Fetch all matches for a competition and season */
export async function fetchMatches(
  competition: string,
  season: number
): Promise<FDMatchesResponse> {
  return apiFetch<FDMatchesResponse>(
    `/competitions/${competition}/matches?season=${season}`
  );
}

/** Fetch matches in a date range */
export async function fetchMatchesByDateRange(
  competition: string,
  dateFrom: string,
  dateTo: string
): Promise<FDMatchesResponse> {
  return apiFetch<FDMatchesResponse>(
    `/competitions/${competition}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
}

/** Fetch group standings */
export async function fetchStandings(
  competition: string,
  season: number
): Promise<FDStandingsResponse> {
  return apiFetch<FDStandingsResponse>(
    `/competitions/${competition}/standings?season=${season}`
  );
}
