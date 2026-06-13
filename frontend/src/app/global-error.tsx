"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.875rem", fontWeight: 600 }}>
            Application error
          </h1>
          <p style={{ maxWidth: "28rem", color: "#71717a" }}>
            Something broke at the root of the app. Please try again.
          </p>
          {error.digest && (
            <code
              style={{
                background: "#f4f4f5",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
              }}
            >
              {error.digest}
            </code>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "#18181b",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
