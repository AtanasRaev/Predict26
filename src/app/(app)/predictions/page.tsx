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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Your picks
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">My Predictions</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Submitted", value: submitted },
          { label: "Total Points", value: totalPoints },
          { label: "Exact Scores", value: exactCount },
          { label: "Scored", value: scored.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-card/85 p-4 shadow-sm">
            <div className="text-2xl font-black tabular-nums text-primary">{value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      {predictions.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card/75 py-12 text-center text-muted-foreground">
          You have not made any predictions yet.{" "}
          <Link href="/fixtures" className="font-semibold text-primary hover:underline">
            Browse fixtures
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/85 shadow-xl shadow-black/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-4 text-left">Match</th>
                <th className="hidden px-4 py-4 text-center md:table-cell">Date</th>
                <th className="px-4 py-4 text-center">Pick</th>
                <th className="hidden px-4 py-4 text-center sm:table-cell">Result</th>
                <th className="px-4 py-4 text-center">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {predictions.map((pred) => {
                const m = pred.match;
                const isFinished = m.status === "FINISHED";
                return (
                  <tr key={pred.id} className="transition-colors hover:bg-white/[0.035]">
                    <td className="px-4 py-4">
                      <Link href={`/match/${m.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                        <TeamCrest crestUrl={m.homeTeam.crestUrl} teamName={m.homeTeam.name} size="sm" />
                        <span className="truncate font-bold">{m.homeTeam.shortName}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="truncate font-bold">{m.awayTeam.shortName}</span>
                        <TeamCrest crestUrl={m.awayTeam.crestUrl} teamName={m.awayTeam.name} size="sm" />
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground md:hidden">{formatDate(m.utcDate)}</div>
                    </td>
                    <td className="hidden px-4 py-4 text-center text-muted-foreground md:table-cell">
                      {formatDate(m.utcDate)}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-base font-black">
                      {pred.predictedHomeGoals}-{pred.predictedAwayGoals}
                    </td>
                    <td className="hidden px-4 py-4 text-center font-mono sm:table-cell">
                      {isFinished && m.homeScore !== null && m.awayScore !== null ? (
                        `${m.homeScore}-${m.awayScore}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isFinished && pred.points !== null ? (
                        <Badge variant={pred.points > 0 ? "default" : "secondary"}>
                          {pred.points}pt{pred.points !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
