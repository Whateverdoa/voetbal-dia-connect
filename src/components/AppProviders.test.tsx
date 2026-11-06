import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/coach"),
  clerkProvider: vi.fn(),
  convexProvider: vi.fn(),
  clerkNav: vi.fn(),
  roleSync: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => {
    mocks.clerkProvider();
    return <div data-testid="clerk-provider">{children}</div>;
  },
}));

vi.mock("./ConvexClientProvider", () => ({
  ConvexClientProvider: ({ children }: { children: ReactNode }) => {
    mocks.convexProvider();
    return <div data-testid="convex-provider">{children}</div>;
  },
}));

vi.mock("./ClerkNav", () => ({
  ClerkNav: () => {
    mocks.clerkNav();
    return <nav aria-label="Accountnavigatie" />;
  },
}));

vi.mock("./SignedInRoleSync", () => ({
  SignedInRoleSync: () => {
    mocks.roleSync();
    return <span data-testid="signed-in-role-sync" />;
  },
}));

async function loadProviders(clerkEnabled: boolean) {
  // The publishable key is read when the module is evaluated, as in a build.
  vi.stubEnv(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    clerkEnabled ? "pk_test_provider_test" : undefined,
  );
  vi.resetModules();
  return (await import("./AppProviders")).AppProviders;
}

describe("AppProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePathname.mockReturnValue("/coach");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the standalone substitution demo without mounting auth or backend dependencies", async () => {
    const AppProviders = await loadProviders(true);
    mocks.usePathname.mockReturnValue("/demo/wisselmodule");

    render(
      <AppProviders>
        <h1>Wisselmodule</h1>
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: "Wisselmodule" })).toBeVisible();
    expect(mocks.clerkProvider).not.toHaveBeenCalled();
    expect(mocks.convexProvider).not.toHaveBeenCalled();
    expect(mocks.clerkNav).not.toHaveBeenCalled();
    expect(mocks.roleSync).not.toHaveBeenCalled();
  });

  it("keeps account navigation and role synchronization inside both providers on coach routes", async () => {
    const AppProviders = await loadProviders(true);

    render(
      <AppProviders>
        <h1>Coachdashboard</h1>
      </AppProviders>,
    );

    const clerk = screen.getByTestId("clerk-provider");
    const convex = screen.getByTestId("convex-provider");
    expect(clerk).toContainElement(convex);
    expect(convex).toContainElement(
      screen.getByRole("navigation", { name: "Accountnavigatie" }),
    );
    expect(convex).toContainElement(screen.getByTestId("signed-in-role-sync"));
    expect(convex).toContainElement(
      screen.getByRole("heading", { name: "Coachdashboard" }),
    );
  });

  it("keeps the backend provider but omits Clerk-dependent components when no key is configured", async () => {
    const AppProviders = await loadProviders(false);

    render(
      <AppProviders>
        <h1>Coachdashboard</h1>
      </AppProviders>,
    );

    expect(screen.getByTestId("convex-provider")).toContainElement(
      screen.getByRole("heading", { name: "Coachdashboard" }),
    );
    expect(mocks.clerkProvider).not.toHaveBeenCalled();
    expect(mocks.clerkNav).not.toHaveBeenCalled();
    expect(mocks.roleSync).not.toHaveBeenCalled();
  });
});
