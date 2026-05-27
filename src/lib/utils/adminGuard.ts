import { auth } from "@/auth";

export async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

export function handleAdminError(err: unknown): Response {
  if (err instanceof Error && err.message === "FORBIDDEN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  console.error("[Admin Error]", err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
