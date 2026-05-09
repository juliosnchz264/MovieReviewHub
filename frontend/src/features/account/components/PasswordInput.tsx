"use client";

import { forwardRef, useState, type KeyboardEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends InputProps {
  showCapsLockHint?: boolean;
  capsLockMessage?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      showCapsLockHint = false,
      capsLockMessage = "Bloq Mayús está activado",
      onKeyDown,
      onKeyUp,
      onBlur,
      ...props
    },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    const [capsOn, setCapsOn] = useState(false);

    function detectCaps(e: KeyboardEvent<HTMLInputElement>) {
      if (!showCapsLockHint) return;
      try {
        setCapsOn(e.getModifierState("CapsLock"));
      } catch {
        // older browsers — ignore
      }
    }

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn("pr-10", className)}
            onKeyDown={(e) => {
              detectCaps(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              detectCaps(e);
              onKeyUp?.(e);
            }}
            onBlur={(e) => {
              setCapsOn(false);
              onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:text-foreground outline-none"
            tabIndex={-1}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {showCapsLockHint && capsOn && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-amber-500 dark:text-amber-400"
          >
            {capsLockMessage}
          </p>
        )}
      </div>
    );
  }
);
