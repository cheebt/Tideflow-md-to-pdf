// Session persistence utilities
// Stores open files, current file, panel visibility, and sample doc content.

import { logger } from './logger';

const sessionLogger = logger.createScoped('Session');

export interface TideflowSessionData {
  openFiles: string[];
  currentFile: string | null;
  rawMdVisible?: boolean;
  renderedMdVisible?: boolean;
  renderedPdfVisible?: boolean;
  fullscreen?: boolean;
  maximized?: boolean;
  sampleDocContent: string | null;
  timestamp: number;
  version: number;
}

// Legacy v1 fields kept around so older sessions still restore something
// reasonable. We map them at load time onto the new field names below.
interface LegacySessionFields {
  previewVisible?: boolean;
  markdownPreviewVisible?: boolean;
}

const KEY = 'tideflowSession';
const VERSION = 2;

/**
 * Read raw session JSON from localStorage. Returns null if no data, version
 * mismatch we can't migrate, or parse error.
 */
export function loadSession(): TideflowSessionData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TideflowSessionData & LegacySessionFields;

    if (data.version === VERSION) return data;

    // v1 → v2: map old preview flags onto the new tri-panel names.
    if (data.version === 1) {
      return {
        ...data,
        rawMdVisible: true,
        renderedMdVisible: data.markdownPreviewVisible ?? true,
        renderedPdfVisible: data.previewVisible ?? true,
        version: VERSION,
      };
    }

    sessionLogger.warn(`Incompatible session version: ${data.version}, expected: ${VERSION}`);
    return null;
  } catch (error) {
    sessionLogger.error('Failed to load session', error);
    return null;
  }
}

/**
 * Merge `partial` into the existing session and persist. Existing fields not
 * present in `partial` are preserved automatically — callers don't need to
 * read the session first to roundtrip values like `fullscreen`.
 */
export function saveSession(partial: Partial<TideflowSessionData>) {
  try {
    const existing = loadSession();
    const merged: TideflowSessionData = {
      openFiles: [],
      currentFile: null,
      rawMdVisible: true,
      renderedMdVisible: true,
      renderedPdfVisible: true,
      fullscreen: false,
      maximized: true,
      sampleDocContent: null,
      version: VERSION,
      ...existing,
      ...partial,
      timestamp: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch (error) {
    sessionLogger.warn('Failed to save session', error);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
    sessionLogger.info('Session cleared');
  } catch (error) {
    sessionLogger.warn('Failed to clear session', error);
  }
}
