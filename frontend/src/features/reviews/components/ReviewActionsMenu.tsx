"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

interface Props {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => Promise<unknown> | void;
  deleteTitle: string;
  deleteDescription?: string;
  triggerAriaLabel?: string;
  className?: string;
}

/**
 * Three-dots overflow menu used on review/reply cards. Only renders the
 * trigger when at least one action is available, so non-owners don't see an
 * empty button. Delete goes through ConfirmDialog — destructive actions
 * should never be one click away.
 */
export function ReviewActionsMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
  triggerAriaLabel,
  className,
}: Props) {
  const t = useTranslate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={triggerAriaLabel ?? t("reviews.actionsMenu")}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            className
          )}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-36">
          {canEdit && (
            <DropdownMenuItem onSelect={onEdit} className="gap-2">
              <Pencil className="size-4" aria-hidden />
              {t("common.edit")}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("common.delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        title={deleteTitle}
        description={deleteDescription}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={onDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
