import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/queries/leaderboard";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) return null;

  const entries = await getLeaderboard();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
        <Trophy className="h-6 w-6 text-yellow-400" />
        Leaderboard
      </h1>

      {entries.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No scored predictions yet. Check back after matches are played.
        </p>
      )}

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="text-center px-3 py-3 w-12">#</th>
              <th className="text-left px-4 py-3">Player</th>
              <th className="text-center px-3 py-3">Pts</th>
              <th className="text-center px-3 py-3 hidden sm:table-cell">Exact 🎯</th>
              <th className="text-center px-3 py-3 hidden sm:table-cell">Correct ✓</th>
              <th className="text-center px-3 py-3 hidden md:table-cell">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === session.user.id;
              const medal =
                entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;

              return (
                <tr
                  key={entry.userId}
                  className={cn(
                    "transition-colors",
                    isCurrentUser
                      ? "bg-primary/8 font-semibold"
                      : entry.rank === 1
                      ? "bg-yellow-400/5 hover:bg-yellow-400/8"
                      : entry.rank === 2
                      ? "bg-slate-400/5 hover:bg-slate-400/8"
                      : entry.rank === 3
                      ? "bg-orange-400/5 hover:bg-orange-400/8"
                      : "hover:bg-muted/20"
                  )}
                >
                  <td className="text-center px-3 py-3 text-base">
                    {medal ?? <span className="text-muted-foreground text-sm">{entry.rank}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span>{entry.username}</span>
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3 font-bold text-primary text-base">
                    {entry.totalPoints}
                  </td>
                  <td className="text-center px-3 py-3 hidden sm:table-cell text-muted-foreground">
                    {entry.exactScoreCount}
                  </td>
                  <td className="text-center px-3 py-3 hidden sm:table-cell text-muted-foreground">
                    {entry.correctOutcomeCount}
                  </td>
                  <td className="text-center px-3 py-3 hidden md:table-cell text-muted-foreground">
                    {entry.submittedCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Tiebreakers: points → exact scores → correct outcomes → submitted predictions → username
      </p>
    </div>
  );
}
