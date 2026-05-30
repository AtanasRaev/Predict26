"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { NotificationToggle } from "@/components/ui/NotificationToggle";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  ShieldCheck,
  Star,
  Trophy,
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

  const initial = session?.user?.username?.[0]?.toUpperCase() ?? "?";
  const mobileLinks =
    session?.user.role === "ADMIN"
      ? [...navLinks.slice(0, 4), { href: "/admin", label: "Admin", icon: ShieldCheck }]
      : navLinks.slice(0, 5);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent/25 bg-accent/15 shadow-lg shadow-accent/5 sm:h-10 sm:w-10">
                <Image src="/logo.png" alt="Predict26" width={26} height={26} className="rounded-sm" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-black uppercase tracking-[0.16em] text-foreground">
                  Predict26
                </span>
                <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground min-[380px]:block">
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

            <div className="flex items-center gap-2">
              {session && (
                <>
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 pl-1 pr-3 sm:flex">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-xs font-black text-accent ring-1 ring-accent/25">
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
                    className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 pb-2 md:hidden">
            {mobileLinks.map(({ href, label, icon: Icon }) => {
              const isActive = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-bold transition-colors min-[380px]:text-[11px]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
