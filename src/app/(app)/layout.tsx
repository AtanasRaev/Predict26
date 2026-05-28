import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { LiveEvents } from "@/components/ui/LiveEvents";
import Image from "next/image";

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
      <LiveEvents />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
        <footer className="border-t border-white/10 bg-card/70 py-5 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
            <Image src="/logo.png" alt="" width={14} height={14} />
            <span>World Cup 2026 - Data from football-data.org</span>
          </div>
        </footer>
      </div>
    </SessionProvider>
  );
}
