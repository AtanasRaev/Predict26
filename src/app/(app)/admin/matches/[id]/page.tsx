"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatchData {
  id: string;
  homeTeam: { id: string; name: string; shortName: string };
  awayTeam: { id: string; name: string; shortName: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  winnerTeamId: string | null;
  utcDate: string;
}

export default function AdminMatchEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState("none");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/admin/matches/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMatch(data);
        setHomeScore(data.homeScore?.toString() ?? "");
        setAwayScore(data.awayScore?.toString() ?? "");
        setStatus(data.status);
        setWinnerTeamId(data.winnerTeamId ?? "none");
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;
    setSaving(true);
    setMessage("");

    const body: Record<string, unknown> = { status };
    if (homeScore !== "") body.homeScore = parseInt(homeScore);
    if (awayScore !== "") body.awayScore = parseInt(awayScore);
    body.winnerTeamId = winnerTeamId === "none" ? null : winnerTeamId;

    const res = await fetch(`/api/admin/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    const data = await res.json();
    if (res.ok) {
      setMessage("✓ Match updated and points recalculated");
      setMatch(data);
    } else {
      setMessage(`Error: ${data.error}`);
    }
  }

  if (!match) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <h1 className="text-xl font-bold mt-2">
          Edit: {match.homeTeam.shortName} vs {match.awayTeam.shortName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Match ID: {match.id}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 border rounded-lg p-5 bg-card">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Home Score ({match.homeTeam.shortName})</Label>
            <Input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Away Score ({match.awayTeam.shortName})</Label>
            <Input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="FINISHED">Finished</SelectItem>
              <SelectItem value="POSTPONED">Postponed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Winner / Qualifier (for knockout)</Label>
          <Select value={winnerTeamId} onValueChange={setWinnerTeamId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No winner / Draw after 90 min</SelectItem>
              <SelectItem value={match.homeTeam.id}>
                {match.homeTeam.name} (qualifies)
              </SelectItem>
              <SelectItem value={match.awayTeam.id}>
                {match.awayTeam.name} (qualifies)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            For knockout: set the team that ultimately qualifies (even via ET/penalties).
          </p>
        </div>

        {message && (
          <p className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
            {message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save and Recalculate Points"}
        </Button>
      </form>
    </div>
  );
}
