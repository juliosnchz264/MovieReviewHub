"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
