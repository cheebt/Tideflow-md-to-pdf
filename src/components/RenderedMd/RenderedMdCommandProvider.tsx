import React from 'react';
import {
  RenderedMdCommandContext,
  type RenderedMdCommandRunner,
} from './renderedMdCommandContext';

export const RenderedMdCommandProvider: React.FC<{
  value: RenderedMdCommandRunner;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <RenderedMdCommandContext.Provider value={value}>
    {children}
  </RenderedMdCommandContext.Provider>
);
