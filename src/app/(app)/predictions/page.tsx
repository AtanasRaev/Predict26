import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/ui/TeamCrest";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function MyPredictionsPage() {
  const session = await auth();
  if (!session) return null;

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: {
      match: {
        include: { homeTeam: true, awayTeam: true },
      },
    },
    orderBy: { match: { utcDate: "desc" } },
  });

  const submitted = predictions.length;
  const scored = predictions.filter((p) => p.points !== null);
  const totalPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);
  const exactCount = scored.filter((p) => p.exactScore).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Predictions</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Submitted", value: submitted },
          { label: "Total Points", value: totalPoints },
          { label: "Exact Scores", value: exactCount },
          { label: "Scored", value: scored.length },
        ].map(({ label, value }) => (
          <div key={label} className="border rounded-lg p-3 text-center bg-card">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {predictions.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          You haven&apos;t made any predictions yet.{" "}
          <Link href="/fixtures" className="underline">
            Browse fixtures
          </Link>
        </p>
      )}

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground">
              <th className="text-left px-4 py-2.5">Match</th>
              <th className="text-center px-4 py-2.5">Date</th>
              <th className="text-center px-4 py-2.5">My Prediction</th>
              <th className="text-center px-4 py-2.5">Result</th>
              <th className="text-center px-4 py-2.5">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {predictions.map((pred) => {
              const m = pred.match;
              const isFinished = m.status === "FINISHED";
              return (
                <tr key={pred.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/match/${m.id}`} className="flex items-center gap-2 hover:underline">
                      <TeamCrest crestUrl={m.homeTeam.crestUrl} teamName={m.homeTeam.name} size="sm" />
                      <span className="font-medium">{m.homeTeam.shortName}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">{m.awayTeam.shortName}</span>
                      <TeamCrest crestUrl={m.awayTeam.crestUrl} teamName={m.awayTeam.name} size="sm" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {formatDate(m.utcDate)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {pred.predictedHomeGoals}–{pred.predictedAwayGoals}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {isFinished && m.homeScore !== null && m.awayScore !== null
                      ? `${m.homeScore}–${m.awayScore}`
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isFinished && pred.points !== null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge variant={pred.points > 0 ? "default" : "secondary"}>
                          {pred.points}pt{pred.points !== 1 ? "s" : ""}
                        </Badge>
                        <div className="text-xs text-muted-foreground flex gap-1">
                          {pred.exactScore && <span title="Exact score">🎯</span>}
                          {pred.correctOutcome && !pred.exactScore && <span title="Correct outcome">✓</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
