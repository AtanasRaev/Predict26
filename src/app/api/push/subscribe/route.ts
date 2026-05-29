import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** GET — returns whether the current user has any active subscription */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ subscribed: false });

  const sub = await prisma.pushSubscription.findFirst({
    where: { userId: session.user.id },
    select: { endpoint: true },
  });

  return NextResponse.json({ subscribed: !!sub });
}

/** POST — save (or update) a push subscription for the current user */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[Push] Invalid subscription body:", JSON.stringify(body), parsed.error.flatten());
    return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      // Re-associate with the current user in case of browser reinstall
      userId: session.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a push subscription (unsubscribe) */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id, endpoint },
    });
  } else {
    // Remove all subscriptions for this user (e.g. sign-out cleanup)
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
