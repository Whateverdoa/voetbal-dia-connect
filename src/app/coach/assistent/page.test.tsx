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
  it("opens ordinary dashboard links in the working read-only preparation", async () => {
    render(await CoachAssistantPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "test");
  });
  it("keeps a selected match in test preparation without requiring a test query parameter", async () => {
    render(await CoachAssistantPage({ searchParams: Promise.resolve({ wedstrijd: "9Q7WH6" }) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "test");
    expect(screen.getByTestId("workspace")).toHaveTextContent("9Q7WH6");
  });
  it("requires explicit rollout to enable saving and always honors an explicit test link", async () => {
    vi.stubEnv("COACH_ASSISTANT_APP_SAVE_ENABLED", "true");
    const view = render(await CoachAssistantPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "app");
    view.unmount();
    render(await CoachAssistantPage({ searchParams: Promise.resolve({ test: "1" }) }));
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-mode", "test");
  });
});
