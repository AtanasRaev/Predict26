import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withTransientDbRetry } from "@/lib/dbRetry";
import type { Prisma } from "@/generated/prisma/client";
import { PushBroadcastControl } from "@/components/admin/PushBroadcastControl";
import { SyncControls } from "@/components/admin/SyncControls";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

type RecentMatch = Prisma.MatchGetPayload<{
  include: { homeTeam: true; awayTeam: true };
}>;

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  let databaseError: string | null = null;
  let syncLogs: Awaited<ReturnType<typeof prisma.apiSyncLog.findMany>> = [];
  let recentMatches: RecentMatch[] = [];
  let pushSubscriptionCount = 0;

  try {
    [syncLogs, recentMatches, pushSubscriptionCount] = await withTransientDbRetry(() =>
      prisma.$transaction([
        prisma.apiSyncLog.findMany({
          orderBy: { startedAt: "desc" },
          take: 20,
        }),
        prisma.match.findMany({
          where: { status: "FINISHED" },
          include: { homeTeam: true, awayTeam: true },
          orderBy: { utcDate: "desc" },
          take: 10,
        }),
        prisma.pushSubscription.count(),
      ])
    );
  } catch (error) {
    console.error("[Admin Page] Failed to load dashboard data", error);
    databaseError =
      error instanceof Error ? error.message : "Unable to load dashboard data";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm">Sync data and manage matches</p>
      </div>

      {databaseError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Database connection failed: {databaseError}
        </div>
      ) : null}

      {/* Sync controls */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Sync Controls</h2>
        <SyncControls initialLogs={JSON.parse(JSON.stringify(syncLogs))} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Push Notifications</h2>
        <PushBroadcastControl initialSubscriptionCount={pushSubscriptionCount} />
      </section>

      {/* Recently finished matches — manual score edit */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recently Finished Matches</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Click a match to manually edit score or winner if the API data is incorrect.
        </p>
        {recentMatches.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center border rounded-lg">
            No finished matches yet
          </p>
        ) : (
          <div className="border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="text-left px-4 py-2.5">Match</th>
                  <th className="text-center px-3 py-2.5">Score</th>
                  <th className="text-center px-3 py-2.5">Date</th>
                  <th className="text-center px-3 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {match.homeTeam.shortName} vs {match.awayTeam.shortName}
                    </td>
                    <td className="text-center px-3 py-3 font-mono font-semibold">
                      {match.homeScore ?? "?"} – {match.awayScore ?? "?"}
                    </td>
                    <td className="text-center px-3 py-3 text-muted-foreground">
                      {formatDateTime(match.utcDate)}
                    </td>
                    <td className="text-center px-3 py-3">
                      <Link
                        href={`/admin/matches/${match.id}`}
                        className="text-xs underline hover:text-foreground text-muted-foreground"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sync logs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Sync Log (last 20)</h2>
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-center px-3 py-2">Requests</th>
                <th className="text-left px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{log.syncType}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateTime(log.startedAt)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant={
                        log.status === "SUCCESS"
                          ? "default"
                          : log.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {log.requestCount}
                  </td>
                  <td className="px-3 py-2 text-destructive text-xs truncate max-w-48">
                    {log.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
