"use client";

import { useState } from "react";
import { Bell, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PushBroadcastControlProps {
  initialSubscriptionCount: number;
}

export function PushBroadcastControl({
  initialSubscriptionCount,
}: PushBroadcastControlProps) {
  const [title, setTitle] = useState("Predict26");
  const [body, setBody] = useState("Test notification from Predict26.");
  const [url, setUrl] = useState("/fixtures");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function sendBroadcast() {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/admin/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Error: ${data.error ?? "Failed to send notification"}`);
        return;
      }

      setResult(`Sent to ${data.sent} device(s), pruned ${data.prunedExpired} expired endpoint(s).`);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-sm">Broadcast Notification</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends a push notification to all subscribed devices. Currently stored: {initialSubscriptionCount}.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(8rem,0.5fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="push-title">Title</Label>
              <Input
                id="push-title"
                value={title}
                maxLength={80}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="push-body">Body</Label>
              <Input
                id="push-body"
                value={body}
                maxLength={240}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="push-url">Open URL</Label>
              <Input
                id="push-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
          </div>

          {result && (
            <p
              className={`mt-3 text-xs ${
                result.startsWith("Sent") ? "text-green-500" : "text-destructive"
              }`}
            >
              {result}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={sendBroadcast}
          disabled={loading || title.trim().length === 0 || body.trim().length === 0}
          className="shrink-0"
        >
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Send</span>
        </Button>
      </div>
    </div>
  );
}
