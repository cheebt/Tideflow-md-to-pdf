/**
 * Cross-component bus for triggering the Typst auto-render.
 *
 * Auto-render lives inside the Editor (raw-md) component because it depends
 * on per-document state managed by useFileOperations. Other parts of the
 * app (like the rendered-md WYSIWYG editor) also need to trigger a recompile
 * when they edit the document, without taking a hard dependency on Editor's
 * internals.
 *
 * Editor registers a handler via `registerAutoRenderHandler` once on mount.
 * Anyone who wants a recompile calls `triggerAutoRender(content)` and the
 * registered handler runs. If no handler is registered (Editor not mounted
 * yet, or raw-md panel hidden) the call is silently dropped — the PDF will
 * catch up when raw-md is back or when the user clicks Render.
 */

export type AutoRenderHandler = (content: string, signal?: AbortSignal) => Promise<void> | void;

let currentHandler: AutoRenderHandler | null = null;
let lastSignal: { abort: () => void } | null = null;
let pendingTimer: number | null = null;
let pendingContent: string | null = null;

const DEFAULT_DEBOUNCE_MS = 400;

export function registerAutoRenderHandler(handler: AutoRenderHandler): () => void {
  currentHandler = handler;
  return () => {
    if (currentHandler === handler) currentHandler = null;
  };
}

/**
 * Schedule an auto-render. Coalesces rapid calls inside a short window so a
 * burst of edits results in one compile after the user stops typing.
 */
export function triggerAutoRender(content: string, debounceMs: number = DEFAULT_DEBOUNCE_MS): void {
  pendingContent = content;
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
  }
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    const handler = currentHandler;
    const next = pendingContent;
    pendingContent = null;
    if (!handler || next == null) return;
    if (lastSignal) {
      try { lastSignal.abort(); } catch { /* ignore */ }
    }
    const controller = new AbortController();
    lastSignal = controller;
    try {
      const ret = handler(next, controller.signal);
      if (ret && typeof (ret as Promise<void>).catch === 'function') {
        (ret as Promise<void>).catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('[autoRenderBus] handler error', err);
        });
      }
    } catch (err) {
      console.warn('[autoRenderBus] handler threw', err);
    }
  }, debounceMs);
}
