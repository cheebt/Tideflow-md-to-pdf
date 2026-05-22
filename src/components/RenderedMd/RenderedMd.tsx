import React, { useCallback, useEffect, useRef } from 'react';
import { Crepe } from '@milkdown/crepe';
import { replaceAll } from '@milkdown/utils';
import type { Ctx } from '@milkdown/ctx';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useActiveContent, useActiveFile } from '../../hooks/useActiveDocument';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { scrubRawTypstAnchors } from '../../utils/scrubAnchors';
import { triggerAutoRender } from '../../utils/autoRenderBus';
import RenderedMdToolbar from './RenderedMdToolbar';
import { RenderedMdCommandProvider } from './RenderedMdCommandProvider';
import './RenderedMd.css';

/**
 * Middle panel — WYSIWYG markdown editor (Milkdown Crepe).
 *
 * Source of truth lives in the editor store; this component:
 *  - On mount and active-file change, replaces editor content with the
 *    active file's markdown.
 *  - When the user edits here, pushes the new markdown back into the store
 *    (so raw-md and rendered-pdf both pick it up) and asks the auto-render
 *    bus to schedule a Typst compile.
 *  - When raw-md (or any other source) updates the store, calls replaceAll
 *    so the WYSIWYG view stays in sync.
 *
 * Feedback-loop guard: `lastEmittedRef` records the *scrubbed* markdown
 * Crepe most recently emitted. Store updates whose scrubbed form matches
 * this value are skipped (they came from us). Updates that differ are
 * treated as external and trigger replaceAll. Critical that we compare
 * *scrubbed* values because scrubRawTypstAnchors also trims trailing
 * whitespace, so the store/raw-md form and the Milkdown form can
 * legitimately differ in trailing newlines without being a "real" change.
 */
const RenderedMd: React.FC = () => {
  const activeFile = useActiveFile();
  const content = useActiveContent();
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);

  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const lastEmittedRef = useRef<string>(scrubRawTypstAnchors(content));
  const activeFileRef = useRef<string | null>(activeFile);
  activeFileRef.current = activeFile;

  // Command runner exposed via context to the toolbar. Re-reads the ref on
  // every call, so the toolbar doesn't have to track when the editor is
  // ready — clicks made before mount-completion silently no-op.
  const runCommand = useCallback((action: (ctx: Ctx) => unknown) => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    try {
      crepe.editor.action(action);
    } catch (err) {
      console.warn('[RenderedMd] command failed', err);
    }
  }, []);

  // Initialize Crepe once when we have a mount point and a file open.
  // Recreate when the active file changes — switching files is the cleanest
  // moment to reset history/cursor, and Crepe doesn't expose a "load new
  // doc with fresh history" API.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !activeFile) return;

    let disposed = false;

    const initialMarkdown = scrubRawTypstAnchors(content);
    lastEmittedRef.current = initialMarkdown;

    const crepe = new Crepe({
      root,
      defaultValue: initialMarkdown,
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (disposed) return;
        const scrubbed = scrubRawTypstAnchors(markdown);
        // Skip if the *meaningful* content didn't change — e.g. Milkdown
        // re-emitted with a trailing newline added/removed.
        if (scrubbed === lastEmittedRef.current) return;
        lastEmittedRef.current = scrubbed;

        const path = activeFileRef.current;
        if (!path) return;
        const store = useEditorStore.getState();
        const prev = store.documents[path]?.content;
        if (prev === scrubbed) return;
        store.updateDocumentContent(path, scrubbed);
        store.markDocumentModified(path, true);
        // Kick the PDF re-render. The bus debounces internally so quick
        // typing fires only the trailing compile.
        triggerAutoRender(scrubbed);
      });

      listener.focus(() => {
        if (!disposed) setFocusedPanel('rendered-md');
      });
    });

    crepe.create().catch((err) => {
      console.error('[RenderedMd] failed to create Crepe', err);
    });

    crepeRef.current = crepe;

    return () => {
      disposed = true;
      crepeRef.current = null;
      crepe.destroy().catch(() => {
        // Cleanup; ignore failures from destroying an editor that may not
        // have finished initializing.
      });
    };
    // We intentionally key off activeFile only — content changes are handled
    // by the next effect via replaceAll, not by recreating the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, setFocusedPanel]);

  // Push external content updates (e.g. from raw-md editing) into Crepe via
  // replaceAll. Skip when the update came from this component itself.
  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) return;
    const scrubbed = scrubRawTypstAnchors(content);
    if (scrubbed === lastEmittedRef.current) return;

    lastEmittedRef.current = scrubbed;
    try {
      crepe.editor.action(replaceAll(scrubbed));
    } catch (err) {
      console.warn('[RenderedMd] replaceAll failed', err);
    }
  }, [content]);

  if (!activeFile) {
    return (
      <RenderedMdCommandProvider value={runCommand}>
        <div className="rendered-md">
          <RenderedMdToolbar />
          <div className="rendered-md-empty">
            <p>No file open</p>
            <p className="rendered-md-empty-sub">The WYSIWYG editor will appear here.</p>
          </div>
        </div>
      </RenderedMdCommandProvider>
    );
  }

  return (
    <RenderedMdCommandProvider value={runCommand}>
      <div className="rendered-md">
        <RenderedMdToolbar />
        <div className="rendered-md-content" ref={rootRef} />
      </div>
    </RenderedMdCommandProvider>
  );
};

export default RenderedMd;
