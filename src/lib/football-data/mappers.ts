import { MatchStatus } from "@/generated/prisma/client";

const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

export function mapStatus(fdStatus: string): MatchStatus {
  switch (fdStatus) {
    case "FINISHED":
      return MatchStatus.FINISHED;
    case "IN_PLAY":
    case "PAUSED":
      return MatchStatus.LIVE;
    case "POSTPONED":
    case "SUSPENDED":
      return MatchStatus.POSTPONED;
    case "CANCELLED":
      return MatchStatus.CANCELLED;
    default:
      // SCHEDULED, TIMED → both mean upcoming
      return MatchStatus.SCHEDULED;
  }
}

export function isKnockoutStage(stage: string): boolean {
  return KNOCKOUT_STAGES.has(stage);
}
