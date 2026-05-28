import { prisma } from "@/lib/prisma";
import { TeamCrest } from "@/components/ui/TeamCrest";

async function getStandings() {
  const standings = await prisma.standing.findMany({
    include: { team: true },
    orderBy: [{ groupName: "asc" }, { position: "asc" }],
  });

  const grouped = new Map<string, typeof standings>();
  for (const s of standings) {
    if (!grouped.has(s.groupName)) grouped.set(s.groupName, []);
    grouped.get(s.groupName)!.push(s);
  }

  return grouped;
}

function groupLabel(groupName: string) {
  if (groupName === "LEAGUE") return "League Table";
  return `Group ${groupName.replace("GROUP_", "")}`;
}

export default async function GroupsPage() {
  const grouped = await getStandings();
  const groups = Array.from(grouped.entries());

  const isLeague = groups.length === 1 && groups[0][0] === "LEAGUE";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isLeague ? "Standings" : "Group Standings"}
      </h1>

      {groups.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No standings data yet. Run &quot;Sync Standings&quot; in the admin panel.
        </p>
      )}

      <div className={isLeague ? "" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
        {groups.map(([groupName, entries]) => (
          <div key={groupName} className="border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b">
              <h2 className="font-semibold text-sm">{groupLabel(groupName)}</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left px-3 py-1.5 w-6">#</th>
                  <th className="text-left px-1 py-1.5">Team</th>
                  <th className="text-center px-1 py-1.5 w-7">P</th>
                  <th className="text-center px-1 py-1.5 w-7">W</th>
                  <th className="text-center px-1 py-1.5 w-7">D</th>
                  <th className="text-center px-1 py-1.5 w-7">L</th>
                  <th className="text-center px-1 py-1.5 w-8">GD</th>
                  <th className="text-center px-2 py-1.5 w-8 font-bold text-foreground">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => {
                  const gd = entry.goalsFor - entry.goalsAgainst;
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{entry.position}</td>
                      <td className="px-1 py-2">
                        <div className="flex items-center gap-1.5">
                          <TeamCrest
                            crestUrl={entry.team.crestUrl}
                            teamName={entry.team.name}
                            size="sm"
                          />
                          <span className="font-medium truncate">{entry.team.shortName}</span>
                        </div>
                      </td>
                      <td className="text-center px-1 py-2">{entry.played}</td>
                      <td className="text-center px-1 py-2">{entry.won}</td>
                      <td className="text-center px-1 py-2">{entry.drawn}</td>
                      <td className="text-center px-1 py-2">{entry.lost}</td>
                      <td className="text-center px-1 py-2">
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                      <td className="text-center px-2 py-2 font-bold">{entry.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
