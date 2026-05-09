"use client";

import { ReactNode, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  preview?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccountSection({
  title,
  description,
  preview,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const headerId = `${id}-header`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        id={headerId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none"
      >
        <div className="flex-1 space-y-0.5">
          <h2 className="text-base font-medium">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {preview && !open && (
            <p className="pt-1 text-sm text-foreground/80">{preview}</p>
          )}
        </div>
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-border px-5 py-5"
        >
          {children}
        </div>
      )}
    </section>
  );
}
