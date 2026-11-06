import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CoachAssistantPage from "./page";

vi.mock("@/components/coach-assistant/CoachAssistantWorkspace", () => ({
  CoachAssistantWorkspace: ({ initialCode, testMode }: { initialCode: string; testMode: boolean }) =>
    <div data-testid="workspace" data-mode={testMode ? "test" : "app"}>{initialCode}</div>,
}));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "configured");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
  vi.stubEnv("COACH_ASSISTANT_APP_SAVE_ENABLED", "");
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("coach assistant entry route", () => {
  it("opens ordinary dashboard links with the deployed app bridge", async () => {
    render(await CoachAssistantPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "app");
  });
  it("keeps the selected match in the connected preparation", async () => {
    render(await CoachAssistantPage({ searchParams: Promise.resolve({ wedstrijd: "9Q7WH6" }) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "app");
    expect(screen.getByTestId("workspace")).toHaveTextContent("9Q7WH6");
  });
  it("honors the rollback switch and always honors an explicit test link", async () => {
    vi.stubEnv("COACH_ASSISTANT_APP_SAVE_ENABLED", "false");
    const view = render(await CoachAssistantPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "test");
    view.unmount();
    render(await CoachAssistantPage({ searchParams: Promise.resolve({ test: "1" }) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "test");
  });
});
