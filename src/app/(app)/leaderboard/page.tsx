import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/queries/leaderboard";
import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) return null;

  const entries = await getLeaderboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Competition table
          </p>
          <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-black tracking-tight">
            <Trophy className="h-7 w-7 text-accent" />
            Leaderboard
          </h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Tiebreakers: points, exact scores, correct outcomes, submitted predictions, username.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card/75 py-12 text-center text-muted-foreground">
          No scored predictions yet. Check back after matches are played.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/85 shadow-xl shadow-black/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="w-14 px-3 py-4 text-center">Rank</th>
                <th className="px-4 py-4 text-left">Player</th>
                <th className="px-3 py-4 text-center">Pts</th>
                <th className="hidden px-3 py-4 text-center sm:table-cell">Exact</th>
                <th className="hidden px-3 py-4 text-center sm:table-cell">Correct</th>
                <th className="hidden px-3 py-4 text-center md:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {entries.map((entry) => {
                const isCurrentUser = entry.userId === session.user.id;
                const isPodium = entry.rank <= 3;

                return (
                  <tr
                    key={entry.userId}
                    className={cn(
                      "transition-colors",
                      isCurrentUser
                        ? "bg-primary/12 font-semibold"
                        : isPodium
                        ? "bg-accent/6 hover:bg-accent/10"
                        : "hover:bg-white/[0.035]"
                    )}
                  >
                    <td className="px-3 py-4 text-center">
                      <span
                        className={cn(
                          "inline-grid h-8 w-8 place-items-center rounded-full text-xs font-black",
                          isPodium ? "bg-accent/18 text-accent ring-1 ring-accent/25" : "bg-white/[0.055] text-muted-foreground"
                        )}
                      >
                        {isPodium ? <Medal className="h-4 w-4" /> : entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold">
                        {entry.username}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground sm:hidden">
                        <span>{entry.exactScoreCount} exact</span>
                        <span>{entry.correctOutcomeCount} correct</span>
                        <span>{entry.submittedCount} submitted</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center text-lg font-black tabular-nums text-primary">
                      {entry.totalPoints}
                    </td>
                    <td className="hidden px-3 py-4 text-center text-muted-foreground sm:table-cell">
                      {entry.exactScoreCount}
                    </td>
                    <td className="hidden px-3 py-4 text-center text-muted-foreground sm:table-cell">
                      {entry.correctOutcomeCount}
                    </td>
                    <td className="hidden px-3 py-4 text-center text-muted-foreground md:table-cell">
                      {entry.submittedCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
