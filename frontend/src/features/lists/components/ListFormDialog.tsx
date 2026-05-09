"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientPortal } from "@/components/ui/client-portal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CustomList, ListVisibility } from "@/types/list";

export interface ListFormValues {
  title: string;
  description: string;
  visibility: ListVisibility;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: CustomList;
  onClose: () => void;
  onSubmit: (values: ListFormValues) => Promise<unknown>;
}

const VISIBILITIES: { value: ListVisibility; label: string; hint: string }[] = [
  { value: "PRIVATE", label: "Private", hint: "Solo tú la puedes ver" },
  { value: "UNLISTED", label: "Unlisted", hint: "Cualquiera con el link" },
  { value: "PUBLIC", label: "Public", hint: "Visible en tu perfil" },
];

export function ListFormDialog({ open, mode, initial, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("PRIVATE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setVisibility(initial?.visibility ?? "PRIVATE");
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmedTitle = title.trim();
  const valid = trimmedTitle.length >= 1 && trimmedTitle.length <= 80 && description.length <= 500;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: trimmedTitle, description, visibility });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientPortal>
    <div className="fixed inset-0 z-60 isolate flex items-center justify-center p-4">
      <button
        aria-label="Close"
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-10 w-full max-w-md space-y-4 rounded-xl border border-border bg-popover p-5 shadow-lg",
          "animate-in fade-in-0 zoom-in-95"
        )}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Create list" : "Edit list"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium">Title</span>
          <Input
            autoFocus
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Best of 2026"
            required
          />
          <span className="text-[10px] text-muted-foreground">{title.length}/80</span>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium">Description</span>
          <textarea
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={3}
            className={cn(
              "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors",
              "focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
            )}
          />
          <span className="text-[10px] text-muted-foreground">{description.length}/500</span>
        </label>

        <fieldset className="space-y-1">
          <legend className="text-xs font-medium">Visibility</legend>
          <div className="grid gap-1.5">
            {VISIBILITIES.map((v) => (
              <label
                key={v.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 text-sm",
                  visibility === v.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/60"
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={v.value}
                  checked={visibility === v.value}
                  onChange={() => setVisibility(v.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium">{v.label}</span>
                  <span className="block text-xs text-muted-foreground">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? "..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </form>
    </div>
    </ClientPortal>
  );
}
