import { getPredictionLockTime } from "@/lib/constants";

/** Number of days ahead predictions are allowed (0 = today only, 2 = today + 2 more days). */
const PREDICTION_WINDOW_DAYS = 2;

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
 * Returns true if the match falls within the prediction window:
 * today or up to PREDICTION_WINDOW_DAYS days ahead, in Boston time (America/New_York).
 */
export function isMatchWithinPredictionWindow(matchUtcDate: Date): boolean {
  const tz = "America/New_York";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Parse both dates as Boston local calendar dates (no time/tz offset involved)
  const todayStr = fmt.format(new Date());
  const matchStr = fmt.format(new Date(matchUtcDate));

  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [my, mm, md] = matchStr.split("-").map(Number);

  const todayCalendar = new Date(ty, tm - 1, td);
  const matchCalendar = new Date(my, mm - 1, md);

  const diffDays = Math.round(
    (matchCalendar.getTime() - todayCalendar.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays >= 0 && diffDays <= PREDICTION_WINDOW_DAYS;
}

/**
 * Returns true if predictions are currently open for this match:
 * - The match is within the prediction window (today to PREDICTION_WINDOW_DAYS ahead)
 * - AND the prediction lock time hasn't passed yet
 */
export function isOpenForPrediction(matchUtcDate: Date): boolean {
  return isMatchWithinPredictionWindow(matchUtcDate) && !isMatchLocked(matchUtcDate);
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
 * "not_open"     — match is more than PREDICTION_WINDOW_DAYS days away
 * "predicted"    — user has submitted a prediction within the open window
 * "not_predicted"— user hasn't predicted yet, window is open
 */
export function getPredictionStatus(
  hasPrediction: boolean,
  matchUtcDate: Date
): "predicted" | "not_predicted" | "locked" | "not_open" {
  if (isMatchLocked(matchUtcDate)) return "locked";
  if (!isMatchWithinPredictionWindow(matchUtcDate)) return "not_open";
  if (hasPrediction) return "predicted";
  return "not_predicted";
}
