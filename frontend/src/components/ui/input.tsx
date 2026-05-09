import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "outline-none transition-colors",
        "focus:border-ring focus:ring-2 focus:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        "placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
