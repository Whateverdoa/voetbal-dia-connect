import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteShell } from "./RouteShell";

const { pathname, connectedModuleLoaded, connectedMounted } = vi.hoisted(() => ({
  pathname: vi.fn(() => "/demo/teamportaal"),
  connectedModuleLoaded: vi.fn(),
  connectedMounted: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: pathname }));
vi.mock("./ConnectedAppShell", () => {
  connectedModuleLoaded();
  return {
    default: ({ children }: { children: ReactNode }) => {
      connectedMounted();
      return <div data-testid="connected-app">{children}</div>;
    },
  };
});

describe("RouteShell", () => {
  beforeEach(() => {
    pathname.mockReturnValue("/demo/teamportaal");
    connectedMounted.mockClear();
  });

  it("renders the demo without even loading provider or role-sync modules", () => {
    render(<RouteShell>Demo zonder backend</RouteShell>);
    expect(screen.getByText("Demo zonder backend")).toBeInTheDocument();
    expect(connectedModuleLoaded).not.toHaveBeenCalled();
    expect(connectedMounted).not.toHaveBeenCalled();
  });

  it("retains the connected shell on normal routes and unmounts it for the demo", async () => {
    pathname.mockReturnValue("/coach");
    const { rerender } = render(<RouteShell>Coachpagina</RouteShell>);
    expect(await screen.findByTestId("connected-app")).toHaveTextContent("Coachpagina");
    expect(connectedMounted).toHaveBeenCalled();

    connectedMounted.mockClear();
    pathname.mockReturnValue("/demo/teamportaal");
    rerender(<RouteShell>Demo zonder backend</RouteShell>);
    expect(screen.queryByTestId("connected-app")).not.toBeInTheDocument();
    expect(connectedMounted).not.toHaveBeenCalled();
  });

  it("does not bypass the connected app for a similar route name", async () => {
    pathname.mockReturnValue("/demo/teamportaal-extra");
    render(<RouteShell>Gewone route</RouteShell>);
    expect(await screen.findByTestId("connected-app")).toHaveTextContent("Gewone route");
  });
});
