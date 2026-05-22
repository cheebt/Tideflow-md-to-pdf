import { createContext } from 'react';
import type { Ctx } from '@milkdown/ctx';

/**
 * A function that runs a Milkdown command on the active Crepe instance.
 * Toolbar buttons call this with `callCommand(commandKey, payload)`.
 *
 * When the editor isn't ready (e.g. mid-mount or no file open) the function
 * silently no-ops so toolbar clicks during those windows don't throw.
 */
export type RenderedMdCommandRunner = (action: (ctx: Ctx) => unknown) => void;

const NOOP: RenderedMdCommandRunner = () => {
  // No editor mounted — formatting buttons just do nothing.
};

export const RenderedMdCommandContext =
  createContext<RenderedMdCommandRunner>(NOOP);
