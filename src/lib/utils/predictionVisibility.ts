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
 */
export function getPredictionStatus(
  hasPrediction: boolean,
  matchUtcDate: Date
): "predicted" | "not_predicted" | "locked" {
  if (isMatchLocked(matchUtcDate)) return "locked";
  if (hasPrediction) return "predicted";
  return "not_predicted";
}
