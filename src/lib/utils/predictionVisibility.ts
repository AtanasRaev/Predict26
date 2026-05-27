import { getPredictionLockTime } from "@/lib/constants";

/**
 * Returns true if predictions for this match are now visible to all users.
 * Predictions become visible when the lock time passes (utcDate - 60s).
 */
export function canSeePredictions(matchUtcDate: Date): boolean {
  return new Date() >= getPredictionLockTime(matchUtcDate);
}

/**
 * Alias — returns true if the match is locked for new predictions.
 */
export function isMatchLocked(matchUtcDate: Date): boolean {
  return canSeePredictions(matchUtcDate);
}

/**
 * Returns true if the match is scheduled for today in Boston time (America/New_York).
 */
export function isMatchToday(matchUtcDate: Date): boolean {
  const tz = "America/New_York";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()) === fmt.format(new Date(matchUtcDate));
}

/**
 * Returns true if predictions are currently open for this match:
 * - The match is today (UTC)
 * - AND the prediction window hasn't closed yet (not locked)
 */
export function isOpenForPrediction(matchUtcDate: Date): boolean {
  return isMatchToday(matchUtcDate) && !isMatchLocked(matchUtcDate);
}

/**
 * Given a list of predictions, filters them based on visibility:
 * - Before lock time: only return the requesting user's own prediction
 * - After lock time: return all predictions
 */
export function filterPredictionsForDisplay<T extends { userId: string }>(
  predictions: T[],
  matchUtcDate: Date,
  requestingUserId: string
): T[] {
  if (canSeePredictions(matchUtcDate)) {
    return predictions;
  }
  return predictions.filter((p) => p.userId === requestingUserId);
}

/**
 * Returns the prediction status label for a given user + match combination.
 * Used in fixture cards and dashboard.
 *
 * "locked"       — match has started / lock time passed
 * "not_open"     — match is in the future but not today (predictions not open yet)
 * "predicted"    — user has submitted a prediction for today's match
 * "not_predicted"— user hasn't predicted yet for today's match
 */
export function getPredictionStatus(
  hasPrediction: boolean,
  matchUtcDate: Date
): "predicted" | "not_predicted" | "locked" | "not_open" {
  if (isMatchLocked(matchUtcDate)) return "locked";
  if (!isMatchToday(matchUtcDate)) return "not_open";
  if (hasPrediction) return "predicted";
  return "not_predicted";
}
