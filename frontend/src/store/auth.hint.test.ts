import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("authStore sessionHint cookie read", () => {
  const realCookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

  beforeEach(() => {
    // Reset modules so the store re-runs its sync init with the cookie of choice.
    vi.resetModules();
  });

  afterEach(() => {
    if (realCookie) Object.defineProperty(Document.prototype, "cookie", realCookie);
  });

  it("initial sessionHint=true when auth_hint=1 cookie present", async () => {
    Object.defineProperty(Document.prototype, "cookie", {
      configurable: true,
      get: () => "foo=bar; auth_hint=1; lang=es",
    });
    const { useAuthStore } = await import("./auth");
    expect(useAuthStore.getState().sessionHint).toBe(true);
  });

  it("initial sessionHint=false when no auth_hint cookie", async () => {
    Object.defineProperty(Document.prototype, "cookie", {
      configurable: true,
      get: () => "foo=bar; lang=es",
    });
    const { useAuthStore } = await import("./auth");
    expect(useAuthStore.getState().sessionHint).toBe(false);
  });
});
