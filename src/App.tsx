import { useEffect, useState, useRef } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { saveSession } from './utils/session';
import { logger } from './utils/logger';
import './App.css';
import { INSTRUCTIONS_DOC } from './instructionsDoc';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useWindowManagement } from './hooks/useWindowManagement';

// Import components
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import RenderedMd from './components/RenderedMd';
import PDFPreview from './components/PDFPreview';
import PDFErrorBoundary from './components/PDFErrorBoundary';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { ToastContainer } from './components/ToastContainer';

// Create scoped logger for App component
const appLogger = logger.createScoped('App');

function App() {
  const [loading, setLoading] = useState(true);
  const {
    rawMdVisible,
    setRawMdVisible,
    renderedMdVisible,
    setRenderedMdVisible,
    renderedPdfVisible,
    setRenderedPdfVisible,
  } = useUIStore();
  const isTyping = useEditorStore((state) => state.isTyping);

  const rawMdPanelRef = useRef<ImperativePanelHandle>(null);
  const renderedMdPanelRef = useRef<ImperativePanelHandle>(null);
  const renderedPdfPanelRef = useRef<ImperativePanelHandle>(null);

  // Drag-flags so we know if a collapse came from the user dragging a handle
  // (in which case we sync the store) vs. from us programmatically resizing.
  // Handles sit between panels: handleLeft is raw-md ↔ rendered-md;
  // handleRight is rendered-md ↔ rendered-pdf.
  const isDraggingHandleLeftRef = useRef(false);
  const isDraggingHandleRightRef = useRef(false);

  // Initialize app with extracted hook
  useAppInitialization();

  // Window management and fullscreen logic
  useWindowManagement(setLoading);

  // Compute default panel sizes based on which panels are visible. Sums to
  // 100 across visible panels.
  const computePanelSize = (which: 'raw-md' | 'rendered-md' | 'rendered-pdf') => {
    const visible = {
      'raw-md': rawMdVisible,
      'rendered-md': renderedMdVisible,
      'rendered-pdf': renderedPdfVisible,
    } as const;
    const count = (visible['raw-md'] ? 1 : 0) + (visible['rendered-md'] ? 1 : 0) + (visible['rendered-pdf'] ? 1 : 0);
    if (count === 0 || !visible[which]) return 0;
    return Math.floor(100 / count);
  };

  // Drive each panel's collapsed/expanded state from the store. Resize to a
  // sensible share of the panel group whenever the visibility flags change.
  useEffect(() => {
    const panel = rawMdPanelRef.current;
    if (!panel) return;
    if (rawMdVisible) {
      if (panel.isCollapsed()) panel.expand();
      panel.resize(computePanelSize('raw-md'));
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMdVisible, renderedMdVisible, renderedPdfVisible]);

  useEffect(() => {
    const panel = renderedMdPanelRef.current;
    if (!panel) return;
    if (renderedMdVisible) {
      if (panel.isCollapsed()) panel.expand();
      panel.resize(computePanelSize('rendered-md'));
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedMdVisible, rawMdVisible, renderedPdfVisible]);

  useEffect(() => {
    const panel = renderedPdfPanelRef.current;
    if (!panel) return;
    if (renderedPdfVisible) {
      if (panel.isCollapsed()) panel.expand();
      panel.resize(computePanelSize('rendered-pdf'));
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedPdfVisible, rawMdVisible, renderedMdVisible]);

  // Autosave session when key state changes
  const openFiles = useEditorStore((state) => state.openFiles);
  const currentFile = useEditorStore((state) => state.activeFile);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        saveSession({
          openFiles,
          currentFile,
          rawMdVisible,
          renderedMdVisible,
          renderedPdfVisible,
        });
      } catch (error) {
        appLogger.warn('Failed to save session', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [openFiles, currentFile, rawMdVisible, renderedMdVisible, renderedPdfVisible]);

  // Late-load instructions.md if the placeholder is still showing.
  // (Belt-and-braces: useAppInitialization seeds the real content on first
  // run, but if some path managed to leave the placeholder in place we
  // replace it here.)
  useEffect(() => {
    const s = useEditorStore.getState();
    const doc = currentFile ? s.documents[currentFile] : null;
    if (currentFile === 'instructions.md' && doc?.content === '# Loading instructions...') {
      s.updateDocumentContent(currentFile, INSTRUCTIONS_DOC);
    }
  }, [currentFile]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Tideflow...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar />
      <TabBar />
      <div className="address-bar">
        <span className="current-file-path">{currentFile || 'No file open'}</span>
        {isTyping && <span className="typing-indicator">⌨️ Typing</span>}
      </div>
      <div className="main-content">
        <PanelGroup direction="horizontal" style={{ height: '100%', overflow: 'hidden' }}>
          <Panel
            ref={rawMdPanelRef}
            collapsible
            defaultSize={34}
            minSize={15}
            onCollapse={() => {
              if (isDraggingHandleLeftRef.current && rawMdVisible) {
                // Only allow collapsing if rendered-md is on — otherwise
                // re-expand so we never end up with both editor panels off.
                if (renderedMdVisible) setRawMdVisible(false);
                else rawMdPanelRef.current?.expand();
              }
            }}
          >
            <Editor />
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => (isDraggingHandleLeftRef.current = isDragging)}
          />
          <Panel
            ref={renderedMdPanelRef}
            collapsible
            defaultSize={33}
            minSize={15}
            onCollapse={() => {
              if ((isDraggingHandleLeftRef.current || isDraggingHandleRightRef.current) && renderedMdVisible) {
                if (rawMdVisible) setRenderedMdVisible(false);
                else renderedMdPanelRef.current?.expand();
              }
            }}
          >
            <RenderedMd />
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => (isDraggingHandleRightRef.current = isDragging)}
          />
          <Panel
            ref={renderedPdfPanelRef}
            collapsible
            defaultSize={33}
            minSize={20}
            onCollapse={() => {
              if (isDraggingHandleRightRef.current && renderedPdfVisible) {
                setRenderedPdfVisible(false);
              }
            }}
          >
            <PDFErrorBoundary>
              <PDFPreview />
            </PDFErrorBoundary>
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}

export default App;
