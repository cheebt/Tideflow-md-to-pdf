import { useContext } from 'react';
import { RenderedMdCommandContext, type RenderedMdCommandRunner } from './renderedMdCommandContext';

export function useRenderedMdCommand(): RenderedMdCommandRunner {
  return useContext(RenderedMdCommandContext);
}
