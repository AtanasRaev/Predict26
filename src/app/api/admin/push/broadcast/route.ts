import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { broadcastPush } from "@/lib/services/pushService";
import { requireAdmin, handleAdminError } from "@/lib/utils/adminGuard";

const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(240),
  url: z.string().trim().startsWith("/").default("/fixtures"),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid push payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, prunedExpired: 0 });
    }

    const goneEndpoints = await broadcastPush(subscriptions, parsed.data);
    if (goneEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: goneEndpoints } },
      });
    }

    return NextResponse.json({
      ok: true,
      sent: subscriptions.length - goneEndpoints.length,
      prunedExpired: goneEndpoints.length,
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
