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

export default async function GroupsPage() {
  const grouped = await getStandings();
  const groups = Array.from(grouped.entries());

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Group Standings</h1>

      {groups.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No standings data yet. Standings will appear after matches begin.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([groupName, entries]) => {
          const label = `Group ${groupName.replace("GROUP_", "")}`;
          return (
            <div key={groupName} className="border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/30 border-b">
                <h2 className="font-semibold text-sm">{label}</h2>
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
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{entry.position}</td>
                      <td className="px-1 py-2 flex items-center gap-1.5">
                        <TeamCrest
                          crestUrl={entry.team.crestUrl}
                          teamName={entry.team.name}
                          size="sm"
                        />
                        <span className="font-medium truncate">{entry.team.shortName}</span>
                      </td>
                      <td className="text-center px-1 py-2">{entry.played}</td>
                      <td className="text-center px-1 py-2">{entry.won}</td>
                      <td className="text-center px-1 py-2">{entry.drawn}</td>
                      <td className="text-center px-1 py-2">{entry.lost}</td>
                      <td className="text-center px-1 py-2">
                        {entry.goalsFor - entry.goalsAgainst > 0
                          ? `+${entry.goalsFor - entry.goalsAgainst}`
                          : entry.goalsFor - entry.goalsAgainst}
                      </td>
                      <td className="text-center px-2 py-2 font-bold">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
