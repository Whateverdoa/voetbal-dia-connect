import { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { clerkRequest } = vi.hoisted(() => ({ clerkRequest: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => clerkRequest,
  createRouteMatcher: () => () => false,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  clerkRequest.mockReset();
});

describe("demo middleware isolation", () => {
  it("bypasses Clerk on the exact demo subtree even when Clerk is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_demo");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_demo");
    const { default: middleware } = await import("./middleware");
    const event = {} as NextFetchEvent;

    for (const path of ["/demo/teamportaal", "/demo/teamportaal/speler"]) {
      const response = middleware(new NextRequest(`http://localhost${path}`), event);
      expect(response).toHaveProperty("status", 200);
    }
    expect(clerkRequest).not.toHaveBeenCalled();

    const request = new NextRequest("http://localhost/demo/teamportaal-extra");
    middleware(request, event);
    expect(clerkRequest).toHaveBeenCalledWith(request, event);
  });
});
