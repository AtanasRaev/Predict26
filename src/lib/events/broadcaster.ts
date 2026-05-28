/**
 * In-memory SSE broadcaster.
 *
 * Keeps a Set of open ReadableStream controllers — one per connected browser tab.
 * When something changes (prediction saved, scores synced, etc.) call broadcast()
 * and every connected client gets a push event, which the LiveEvents component
 * turns into a router.refresh() call.
 *
 * ⚠ Single-process only: works perfectly on a VPS / Docker / local dev.
 *    For multi-instance deployments (multiple servers/pods) swap for Redis pub/sub.
 */

type Ctrl = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<Ctrl>();
const encoder = new TextEncoder();

export function subscribe(ctrl: Ctrl): void {
  clients.add(ctrl);
}

export function unsubscribe(ctrl: Ctrl): void {
  clients.delete(ctrl);
}

/**
 * Push a named SSE event to every connected browser.
 * Stale (disconnected) controllers are pruned automatically.
 */
export function broadcast(event: string, data: Record<string, unknown> = {}): void {
  if (clients.size === 0) return;

  const payload = encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );

  for (const ctrl of [...clients]) {
    try {
      ctrl.enqueue(payload);
    } catch {
      // Controller is closed — clean it up
      clients.delete(ctrl);
    }
  }
}

export function connectedClients(): number {
  return clients.size;
}
