import { auth } from "@/auth";
import { subscribe, unsubscribe } from "@/lib/events/broadcaster";

// Must run on Node.js runtime — Edge runtime can't hold long-lived SSE connections.
export const runtime = "nodejs";
// Don't cache this route.
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/**
 * GET /api/events
 *
 * Authenticated SSE endpoint. Each browser tab opens one persistent connection.
 * The server pushes named events (e.g. "refresh") whenever data changes.
 * The LiveEvents client component listens here and calls router.refresh().
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  let keepaliveTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      subscribe(ctrl);

      // Initial handshake comment — confirms the connection is open
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Send a ": ping" comment every 25 s so proxies / load balancers don't
      // close the idle TCP connection before the client disconnects intentionally.
      keepaliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepaliveTimer);
          unsubscribe(ctrl);
        }
      }, 25_000);
    },

    cancel() {
      // Called when the browser closes the tab / navigates away
      clearInterval(keepaliveTimer);
      unsubscribe(ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Nginx / reverse-proxy response buffering so events are flushed immediately
      "X-Accel-Buffering": "no",
    },
  });
}
