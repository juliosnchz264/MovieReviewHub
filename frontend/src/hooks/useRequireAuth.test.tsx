import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRequireAuth } from "./useRequireAuth";
import { useAuthStore } from "@/store/auth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

beforeEach(() => {
  replace.mockClear();
  useAuthStore.setState({
    accessToken: null,
    user: null,
    sessionRestored: false,
    sessionHint: false,
  });
});

describe("useRequireAuth", () => {
  it("returns ready=false until the session restores", () => {
    const { result } = renderHook(() => useRequireAuth());
    expect(result.current.ready).toBe(false);
    expect(result.current.authed).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to /login once the session is restored and no token is present", () => {
    renderHook(() => useRequireAuth());
    act(() => {
      useAuthStore.getState().markSessionRestored();
    });
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("returns authed=true when a token is present after restore", () => {
    const { result } = renderHook(() => useRequireAuth());
    act(() => {
      useAuthStore.getState().setSession("tok", {
        id: 1,
        username: "u",
        email: "u@example.com",
        role: "ROLE_USER",
      } as never);
    });
    expect(result.current.ready).toBe(true);
    expect(result.current.authed).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
