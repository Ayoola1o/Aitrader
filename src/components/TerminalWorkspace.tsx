'use client';

import React from 'react';
import { TerminalView, TerminalViewProps } from './TerminalView';

/**
 * TerminalWorkspace – Desktop-first quantitative workstation.
 * Re-exports the unified TerminalView component.
 */
export const TerminalWorkspace: React.FC<TerminalViewProps> = (props) => {
  return <TerminalView {...props} />;
};

export default TerminalWorkspace;
