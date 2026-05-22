import React, { useCallback } from 'react';
import { callCommand } from '@milkdown/utils';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
} from '@milkdown/preset-commonmark';
import { useUIStore } from '../../stores/uiStore';
import { useRenderedMdCommand } from './useRenderedMdCommand';

/**
 * Toolbar above the rendered-md (WYSIWYG) panel. Buttons run Milkdown
 * commands on the active Crepe instance. Disabled when the panel isn't
 * focused, matching the per-panel toolbar UX.
 */
const RenderedMdToolbar: React.FC = () => {
  const focusedPanel = useUIStore((s) => s.focusedPanel);
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);
  const runCommand = useRenderedMdCommand();

  const isActive = focusedPanel === 'rendered-md';

  // Stop mousedown from blurring the editor; we want the formatting to apply
  // to whatever was selected when the user clicked the button.
  const preventBlur = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Each handler funnels through runCommand which knows about the editor
  // instance. We also re-assert focus on the panel so subsequent toolbar
  // clicks stay registered as "this panel is active".
  const run = useCallback(
    (action: () => void) => {
      action();
      setFocusedPanel('rendered-md');
    },
    [setFocusedPanel],
  );

  return (
    <div className={`rendered-md-toolbar simple-markdown-toolbar ${isActive ? 'active' : 'disabled'}`}>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(toggleStrongCommand.key)))}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(toggleEmphasisCommand.key)))}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(toggleInlineCodeCommand.key)))}
        title="Inline Code"
      >
        {'</>'}
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInHeadingCommand.key, 1)))}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInHeadingCommand.key, 2)))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInHeadingCommand.key, 3)))}
        title="Heading 3"
      >
        H3
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInBulletListCommand.key)))}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInOrderedListCommand.key)))}
        title="Ordered List"
      >
        1. List
      </button>
      <button
        type="button"
        disabled={!isActive}
        onMouseDown={preventBlur}
        onClick={() => run(() => runCommand(callCommand(wrapInBlockquoteCommand.key)))}
        title="Blockquote"
      >
        ❝
      </button>
    </div>
  );
};

export default RenderedMdToolbar;
