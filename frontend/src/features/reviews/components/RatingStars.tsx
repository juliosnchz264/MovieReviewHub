"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

const SIZE_MAP = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function RatingStars({ value, onChange, size = "md", readOnly = false }: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            aria-label={`${n} stars`}
            className={cn(
              "transition",
              !readOnly && "cursor-pointer hover:scale-110",
              readOnly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                SIZE_MAP[size],
                filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
