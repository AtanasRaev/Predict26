import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LiveEvents } from "@/components/ui/LiveEvents";
import { Trophy } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider>
      {/* SSE listener — pushes router.refresh() whenever the server broadcasts */}
      <LiveEvents />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="border-t bg-card/50 py-4">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Trophy className="h-3 w-3 text-yellow-400/70" />
            <span>World Cup 2026 · Data from football-data.org</span>
          </div>
        </footer>
      </div>
    </SessionProvider>
  );
}
