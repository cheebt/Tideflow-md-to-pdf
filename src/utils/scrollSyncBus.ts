/**
 * Bidirectional proportional scroll sync between the raw-md and rendered-md
 * panels.
 *
 * Each panel registers a handler. When one panel scrolls, the bus broadcasts
 * the scroll ratio (0..1) to the other panels' handlers. Handlers translate
 * the ratio back into a scrollTop and apply it.
 *
 * Feedback loops are prevented two ways:
 *   - When a panel applies a programmatic scroll in response to a broadcast,
 *     it sets its own ignore-flag so its next scroll event isn't re-broadcast.
 *   - The bus also remembers the source of the most recent broadcast and
 *     drops events coming back from other sources within a short window
 *     (a safety net in case a panel's ignore-flag fires too late, e.g. when
 *     the scroll-event arrives in a later animation frame).
 *
 * Anchor-based sync is a future enhancement — for v1 proportional sync is
 * good enough for typical-length documents.
 */

export type ScrollSource = 'raw-md' | 'rendered-md';

export type ScrollSyncHandler = (ratio: number, source: ScrollSource) => void;

const handlers = new Map<ScrollSource, ScrollSyncHandler>();

let lastSource: ScrollSource | null = null;
let lastSourceTime = 0;
const SOURCE_LOCK_MS = 80;

export function registerScrollSync(source: ScrollSource, handler: ScrollSyncHandler): () => void {
  handlers.set(source, handler);
  return () => {
    if (handlers.get(source) === handler) handlers.delete(source);
  };
}

/**
 * Broadcast a scroll position from `source` to every other registered panel.
 * The ratio is clamped to [0, 1].
 */
export function publishScroll(source: ScrollSource, ratio: number): void {
  const now = Date.now();
  // If another source just broadcast and this is a probable echo, drop it.
  if (lastSource && lastSource !== source && now - lastSourceTime < SOURCE_LOCK_MS) {
    return;
  }
  lastSource = source;
  lastSourceTime = now;

  const clamped = Math.max(0, Math.min(1, ratio));
  for (const [key, handler] of handlers) {
    if (key === source) continue;
    try {
      handler(clamped, source);
    } catch (err) {
      console.warn('[scrollSyncBus] handler threw', err);
    }
  }
}
