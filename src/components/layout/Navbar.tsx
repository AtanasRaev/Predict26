"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationToggle } from "@/components/ui/NotificationToggle";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  ShieldCheck,
  Star,
  Trophy,
  X,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/predictions", label: "Predictions", icon: Star },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/groups", label: "Groups", icon: ListOrdered },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initial = session?.user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent/15 shadow-lg shadow-accent/5">
              <Image src="/logo.png" alt="Predict26" width={28} height={28} className="rounded-sm" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.16em] text-foreground">
                Predict26
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                World Cup League
              </span>
            </span>
          </Link>

          <div className="hidden items-center rounded-full border border-white/10 bg-white/[0.035] p-1 md:flex">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {session?.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {session && (
              <>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 pl-1 pr-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-black text-primary ring-1 ring-primary/30">
                    {initial}
                  </span>
                  <span className="max-w-28 truncate text-sm font-medium text-muted-foreground">
                    {session.user.username}
                  </span>
                </div>
                <NotificationToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            )}
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-background/95 px-4 pb-4 pt-3 shadow-2xl md:hidden">
          <div className="space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                  isActivePath(pathname, href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {session?.user.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-3 flex [&_button]:w-full [&_button]:justify-start">
              <NotificationToggle />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-xs font-black text-primary ring-1 ring-primary/30">
                  {initial}
                </span>
                <span className="truncate text-sm font-medium text-muted-foreground">
                  {session?.user.username}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
