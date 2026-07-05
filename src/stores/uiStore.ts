import { create } from 'zustand';
import type { Toast } from '../types';
import type { TabSection } from '../components/DesignModal/types';
import { logger } from '../utils/logger';

const uiLogger = logger.createScoped('UIStore');

export type SettingsTabSection = 'general' | 'about';

/**
 * Which editable panel currently has focus. Drives per-panel toolbar
 * activation: when a panel is focused, only its toolbar buttons are enabled.
 */
export type FocusedPanel = 'raw-md' | 'rendered-md' | null;

// UI-specific store state
interface UIStoreState {
  // Panel visibility — raw-md (left editor) and rendered-md (middle WYSIWYG)
  // are mutually-required: at least one must always be visible. Setters
  // enforce this and silently ignore attempts that would turn both off.
  // rendered-pdf is independent.
  rawMdVisible: boolean;
  setRawMdVisible: (visible: boolean) => void;
  renderedMdVisible: boolean;
  setRenderedMdVisible: (visible: boolean) => void;
  renderedPdfVisible: boolean;
  setRenderedPdfVisible: (visible: boolean) => void;

  // Which editable panel has focus (drives toolbar enable/disable).
  focusedPanel: FocusedPanel;
  setFocusedPanel: (panel: FocusedPanel) => void;

  // PDF controls
  pdfZoom: number;
  setPdfZoom: (zoom: number) => void;
  thumbnailsVisible: boolean;
  setThumbnailsVisible: (visible: boolean) => void;

  // Design modal
  designModalOpen: boolean;
  setDesignModalOpen: (open: boolean) => void;
  designModalActiveTab: TabSection | null;
  setDesignModalActiveTab: (tab: TabSection | null) => void;
  // Settings modal
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  settingsModalActiveTab: SettingsTabSection | null;
  setSettingsModalActiveTab: (tab: SettingsTabSection | null) => void;



  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Sample injection guard
  initialSampleInjected: boolean;
  setInitialSampleInjected: (v: boolean) => void;

  // Recent files (persisted to localStorage)
  recentFiles: string[];
  addRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
}

// Create UI store
export const useUIStore = create<UIStoreState>((set, get) => ({
  // Panel visibility — defaults to a rendered-md-only reader view. Raw and
  // PDF start off so opening a document lands in the WYSIWYG reader; a
  // returning session still restores whatever layout the user last had.
  rawMdVisible: false,
  setRawMdVisible: (visible: boolean) => {
    // Refuse to hide raw-md if rendered-md is also off — one of the two
    // must always be on so the user can edit.
    if (!visible && !get().renderedMdVisible) return;
    set({ rawMdVisible: visible });
  },
  renderedMdVisible: true,
  setRenderedMdVisible: (visible: boolean) => {
    if (!visible && !get().rawMdVisible) return;
    set({ renderedMdVisible: visible });
  },
  renderedPdfVisible: false,
  setRenderedPdfVisible: (visible: boolean) => set({ renderedPdfVisible: visible }),

  // Focused panel — drives toolbar enable state. Defaults to rendered-md to
  // match the default reader layout, so its toolbar is active on open rather
  // than the (hidden by default) raw-md editor's.
  focusedPanel: 'rendered-md',
  setFocusedPanel: (panel: FocusedPanel) => set({ focusedPanel: panel }),

  // PDF controls
  pdfZoom: 1.0,
  setPdfZoom: (zoom: number) => set({ pdfZoom: zoom }),

  thumbnailsVisible: false,
  setThumbnailsVisible: (visible: boolean) => set({ thumbnailsVisible: visible }),

  // Design modal
  designModalOpen: false,
  setDesignModalOpen: (open: boolean) => set({ designModalOpen: open }),
  designModalActiveTab: null,
  setDesignModalActiveTab: (tab: TabSection | null) => set({ designModalActiveTab: tab }),
  // Settings modal (separate from design modal)
  settingsModalOpen: false,
  setSettingsModalOpen: (open: boolean) => set({ settingsModalOpen: open }),
  settingsModalActiveTab: null,
  setSettingsModalActiveTab: (tab: SettingsTabSection | null) => set({ settingsModalActiveTab: tab }),



  // Toast notifications
  toasts: [],
  addToast: (toast: Omit<Toast, 'id'>) => set((state) => ({
    toasts: [
      ...state.toasts,
      {
        ...toast,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    ],
  })),
  removeToast: (id: string) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // Sample injection guard
  initialSampleInjected: false,
  setInitialSampleInjected: (v: boolean) => set({ initialSampleInjected: v }),

  // Recent files (persisted to localStorage)
  recentFiles: (() => {
    try {
      const stored = localStorage.getItem('recentFiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),

  addRecentFile: (path: string) => set((state) => {
    // Don't add sample.md or empty paths to recent files
    if (!path || path === 'sample.md') return state;

    // Remove if already exists, then add to front (max 10)
    const filtered = state.recentFiles.filter(f => f !== path);
    const newRecent = [path, ...filtered].slice(0, 10);

    // Persist to localStorage
    try {
      localStorage.setItem('recentFiles', JSON.stringify(newRecent));
    } catch (e) {
      uiLogger.warn('Failed to save recent files', e);
    }

    return { recentFiles: newRecent };
  }),

  clearRecentFiles: () => set(() => {
    try {
      localStorage.removeItem('recentFiles');
    } catch (e) {
      uiLogger.warn('Failed to clear recent files', e);
    }
    return { recentFiles: [] };
  }),
}));
