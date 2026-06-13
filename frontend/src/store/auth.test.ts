import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth";

const sampleUser = {
  id: 1,
  username: "u",
  email: "u@example.com",
  role: "ROLE_USER",
} as never;

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    sessionRestored: false,
    sessionHint: false,
  });
});

describe("authStore", () => {
  it("setSession marks restored=true and hint=true", () => {
    useAuthStore.getState().setSession("tok", sampleUser);
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("tok");
    expect(s.user).toEqual(sampleUser);
    expect(s.sessionRestored).toBe(true);
    expect(s.sessionHint).toBe(true);
  });

  it("clear wipes token + user + hint but leaves restored true", () => {
    useAuthStore.getState().setSession("tok", sampleUser);
    useAuthStore.getState().clear();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.sessionHint).toBe(false);
  });

  it("markSessionRestored without a token flips restored only", () => {
    useAuthStore.getState().markSessionRestored();
    const s = useAuthStore.getState();
    expect(s.sessionRestored).toBe(true);
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });

  it("setAccessToken does not invent a user", () => {
    useAuthStore.getState().setAccessToken("new");
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("new");
    expect(s.user).toBeNull();
  });
});
