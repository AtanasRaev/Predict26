import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isApiRoute = pathname.startsWith("/api");
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin");

  // Redirect unauthenticated users to login (except auth pages and public API)
  if (!isAuthenticated && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Block non-admin users from admin routes
  if (
    isAuthenticated &&
    isAdminRoute &&
    req.auth?.user?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
