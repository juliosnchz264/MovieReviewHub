import { Globe, Link as LinkIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListVisibility } from "@/types/list";

interface Props {
  visibility: ListVisibility;
  className?: string;
}

const meta: Record<ListVisibility, { label: string; Icon: typeof Lock; tone: string }> = {
  PRIVATE: { label: "Private", Icon: Lock, tone: "bg-muted text-muted-foreground" },
  UNLISTED: { label: "Unlisted", Icon: LinkIcon, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  PUBLIC: { label: "Public", Icon: Globe, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
};

export function VisibilityBadge({ visibility, className }: Props) {
  const { label, Icon, tone } = meta[visibility];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        tone,
        className
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
