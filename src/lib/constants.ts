// TEST MODE: using Serie A 2025/26 — revert to WC dates when done
export const WORLD_CUP_START = new Date("2025-08-01T00:00:00.000Z");
export const WORLD_CUP_END = new Date("2026-07-31T23:59:59.999Z");

/**
 * Lock predictions 60 seconds before kickoff to absorb clock drift
 * between client and server.
 */
export const LOCK_BUFFER_MS = 60_000;

export function isWithinTournamentWindow(): boolean {
  const now = new Date();
  return now >= WORLD_CUP_START && now <= WORLD_CUP_END;
}

/**
 * Returns the server time at which predictions for a match become locked.
 * This is 60 seconds before the official kickoff time.
 */
export function getPredictionLockTime(matchUtcDate: Date): Date {
  return new Date(matchUtcDate.getTime() - LOCK_BUFFER_MS);
}

/**
 * Returns true if predictions for this match are now locked.
 */
export function isMatchLocked(matchUtcDate: Date): boolean {
  return new Date() >= getPredictionLockTime(matchUtcDate);
}
