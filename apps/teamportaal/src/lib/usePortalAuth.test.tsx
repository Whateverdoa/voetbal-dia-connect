import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortalAuth } from "./usePortalAuth";

const mocked = vi.hoisted(() => ({
  getToken: vi.fn(),
  sessionId: "session-coach" as string | null,
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: Boolean(mocked.sessionId),
    sessionId: mocked.sessionId,
    sessionClaims: { aud: "convex" },
    getToken: mocked.getToken,
  }),
}));

beforeEach(() => {
  mocked.getToken.mockReset().mockResolvedValue("verified-template-token");
  mocked.sessionId = "session-coach";
});
afterEach(cleanup);

describe("portal authentication", () => {
  it("requests verified email claims even when the SDK selects the default session token", async () => {
    const { result } = renderHook(usePortalAuth);
    expect(result.current.sessionClaims?.aud).toBe("convex");
    expect(await result.current.getToken({ skipCache: false })).toBe("verified-template-token");
    expect(mocked.getToken).toHaveBeenCalledWith({ template: "convex", skipCache: false });
  });

  it("preserves forced refresh requests", async () => {
    const { result } = renderHook(usePortalAuth);
    await result.current.getToken({ skipCache: true });
    expect(mocked.getToken).toHaveBeenCalledWith({ template: "convex", skipCache: true });
  });

  it("does not fall back to an identity without verified email when the template fails", async () => {
    mocked.getToken.mockRejectedValue(new Error("Template unavailable"));
    const { result } = renderHook(usePortalAuth);
    await expect(result.current.getToken()).rejects.toThrow("Template unavailable");
    expect(mocked.getToken).toHaveBeenCalledTimes(1);
  });

  it("preserves account changes and sign-out for the Convex provider", () => {
    const { result, rerender } = renderHook(usePortalAuth);
    mocked.sessionId = "session-parent";
    rerender();
    expect(result.current.sessionId).toBe("session-parent");
    mocked.sessionId = null;
    rerender();
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.sessionId).toBeNull();
  });
});
