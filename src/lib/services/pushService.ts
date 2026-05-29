/**
 * Server-side Web Push helper.
 * Never import this in client components — it uses the Node.js crypto APIs.
 */
import webpush from "web-push";

let configured = false;

function configure() {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID env vars. Set VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep link opened when the user taps the notification */
  url?: string;
}

interface DbSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SendResult = "ok" | "gone" | "error";

/**
 * Send a push notification to a single subscription.
 * Returns "gone" if the subscription is expired/unsubscribed (caller should delete it).
 */
export async function sendPush(
  subscription: DbSubscription,
  payload: PushPayload
): Promise<SendResult> {
  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 410 Gone = subscription deliberately cancelled by the browser
    // 404 Not Found = endpoint no longer valid
    if (status === 410 || status === 404) return "gone";
    console.error("[Push] send failed:", err);
    return "error";
  }
}

/**
 * Fan out a push notification to many subscriptions at once.
 * Returns the endpoints that are gone (should be deleted from DB).
 */
export async function broadcastPush(
  subscriptions: DbSubscription[],
  payload: PushPayload
): Promise<string[]> {
  const goneEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (result === "gone") goneEndpoints.push(sub.endpoint);
    })
  );

  return goneEndpoints;
}
