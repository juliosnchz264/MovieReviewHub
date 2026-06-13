"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import { useCreateList, useInMyLists } from "@/features/lists/hooks/useLists";
import { listsService } from "@/features/lists/services/lists.service";
import { ListFormDialog, type ListFormValues } from "./ListFormDialog";
import { ListPickerSection } from "./ListPickerSection";
import type { ListItemKind } from "@/types/list";

interface Props {
  kind: ListItemKind;
  targetId: number;
  variant?: "default" | "icon";
  className?: string;
}

export function AddToListPopover({ kind, targetId, variant = "default", className }: Props) {
  const t = useTranslate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const inMyLists = useInMyLists(kind, targetId);
  const createList = useCreateList();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isInAny = useMemo(
    () => (inMyLists.data ?? []).length > 0,
    [inMyLists.data]
  );

  if (!accessToken) return null;

  function handleToggleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }

  async function handleCreate(values: ListFormValues) {
    const created = await createList.mutateAsync({
      title: values.title,
      description: values.description || null,
      visibility: values.visibility,
    });
    await listsService.addItem(created.id, { kind, targetId });
    toast.success(t("lists.pickerItemAdded", { title: created.title }));
  }

  const Trigger = variant === "icon" ? IconTrigger : DefaultTrigger;
  const activeLabel = t("actions.inLists");
  const idleLabel = t("actions.save");
  const ariaIdle = t("actions.addToList");

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        <Trigger
          active={isInAny}
          onClick={handleToggleOpen}
          activeLabel={activeLabel}
          idleLabel={idleLabel}
          ariaIdle={ariaIdle}
        />

        {open && (
          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
              "animate-in fade-in-0 zoom-in-95"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ListPickerSection
              kind={kind}
              targetId={targetId}
              onCreateClick={() => {
                setShowCreate(true);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <ListFormDialog
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}

interface TriggerProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  activeLabel: string;
  idleLabel: string;
  ariaIdle: string;
}

function DefaultTrigger({ active, onClick, activeLabel, idleLabel }: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="menu"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm transition hover:bg-muted",
        active && "border-primary bg-primary/10"
      )}
    >
      {active ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {active ? activeLabel : idleLabel}
    </button>
  );
}

function IconTrigger({ active, onClick, activeLabel, ariaIdle }: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? activeLabel : ariaIdle}
      aria-haspopup="menu"
      className={cn(
        "rounded-full bg-background/80 p-1.5 backdrop-blur transition hover:bg-background"
      )}
    >
      {active ? (
        <BookmarkCheck className="size-4 text-primary" />
      ) : (
        <Bookmark className="size-4 text-foreground/60" />
      )}
    </button>
  );
}
