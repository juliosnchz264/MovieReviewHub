"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  allowHalf?: boolean;
}

const SIZE_MAP = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function RatingStars({
  value,
  onChange,
  size = "md",
  readOnly = false,
  allowHalf = false,
}: Props) {
  const stars = [1, 2, 3, 4, 5];
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value;
  const interactive = !readOnly && !!onChange;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {stars.map((n) => (
        <StarSlot
          key={n}
          n={n}
          display={display}
          size={size}
          interactive={interactive}
          allowHalf={allowHalf}
          onSelect={(v) => onChange?.(v)}
          onHover={(v) => setHover(v)}
        />
      ))}
    </div>
  );
}

interface SlotProps {
  n: number;
  display: number;
  size: "sm" | "md" | "lg";
  interactive: boolean;
  allowHalf: boolean;
  onSelect: (value: number) => void;
  onHover: (value: number | null) => void;
}

function StarSlot({
  n,
  display,
  size,
  interactive,
  allowHalf,
  onSelect,
  onHover,
}: SlotProps) {
  const sizeClass = SIZE_MAP[size];
  const filledFull = display >= n;
  const filledHalf = !filledFull && display >= n - 0.5;

  if (!interactive) {
    return (
      <span className={cn("relative inline-block", sizeClass)} aria-hidden>
        <Star
          className={cn("absolute inset-0", sizeClass, "text-muted-foreground/40")}
        />
        {(filledFull || filledHalf) && (
          <Star
            className={cn(
              "absolute inset-0",
              sizeClass,
              "fill-yellow-400 text-yellow-400"
            )}
            style={
              filledHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined
            }
          />
        )}
      </span>
    );
  }

  if (!allowHalf) {
    return (
      <button
        type="button"
        onClick={() => onSelect(n)}
        onMouseEnter={() => onHover(n)}
        aria-label={`${n} stars`}
        className={cn("transition cursor-pointer hover:scale-110")}
      >
        <Star
          className={cn(
            sizeClass,
            filledFull
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40"
          )}
        />
      </button>
    );
  }

  return (
    <span
      className={cn("relative inline-block transition", sizeClass, "hover:scale-110")}
    >
      <Star
        className={cn("absolute inset-0", sizeClass, "text-muted-foreground/40")}
      />
      {(filledFull || filledHalf) && (
        <Star
          className={cn(
            "absolute inset-0",
            sizeClass,
            "fill-yellow-400 text-yellow-400"
          )}
          style={filledHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(n - 0.5)}
        onMouseEnter={() => onHover(n - 0.5)}
        aria-label={`${n - 0.5} stars`}
        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
      />
      <button
        type="button"
        onClick={() => onSelect(n)}
        onMouseEnter={() => onHover(n)}
        aria-label={`${n} stars`}
        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
      />
    </span>
  );
}
