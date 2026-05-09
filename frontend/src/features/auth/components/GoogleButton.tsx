"use client";

import { Button } from "@/components/ui/button";
import { authService } from "@/features/auth/services/auth.service";

interface GoogleButtonProps {
  label: string;
  redirectTo?: string;
}

export function GoogleButton({ label, redirectTo }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={() => authService.loginWithGoogle(redirectTo)}
      className="w-full"
    >
      <GoogleIcon />
      <span>{label}</span>
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.96h5.52c-.24 1.44-1.68 4.2-5.52 4.2-3.36 0-6.06-2.76-6.06-6.36 0-3.6 2.7-6.36 6.06-6.36 1.92 0 3.18.84 3.9 1.5l2.64-2.52C17.04 2.94 14.76 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.76 0 9.6-4.02 9.6-9.72 0-.66-.06-1.14-.18-1.62L12 10.2z"
      />
      <path
        fill="#4285F4"
        d="M21.6 12.28c0-.66-.06-1.14-.18-1.62L12 10.2v3.96h5.52c-.12.72-.78 2.16-2.22 3.12l3.42 2.64c2.04-1.86 3.36-4.62 3.36-7.64h-.48z"
      />
      <path
        fill="#FBBC05"
        d="M5.94 14.1A6.06 6.06 0 0 1 5.94 9.9L2.46 7.32A10 10 0 0 0 2 12c0 1.62.36 3.18 1.02 4.56l2.92-2.46z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.66-2.46l-3.42-2.64c-.96.66-2.22 1.08-3.24 1.08-2.46 0-4.56-1.62-5.34-3.96L3.06 16.5A10 10 0 0 0 12 22z"
      />
    </svg>
  );
}
