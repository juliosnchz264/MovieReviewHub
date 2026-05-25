"use client";

import { createContext, useContext } from "react";

export interface AutoExpandState {
  expandIds: Set<number>;
  targetReplyId: number | null;
}

const EMPTY: AutoExpandState = {
  expandIds: new Set(),
  targetReplyId: null,
};

/**
 * Carries deep-link expansion intent down the reply tree. Each
 * {@code ReplyNode} reads it to decide whether to start expanded and, if
 * it IS the target reply, to scroll itself into view on mount.
 */
export const AutoExpandContext = createContext<AutoExpandState>(EMPTY);

export function useAutoExpand(): AutoExpandState {
  return useContext(AutoExpandContext);
}
