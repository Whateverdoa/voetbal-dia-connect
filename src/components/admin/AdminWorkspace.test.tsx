import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminWorkspace } from "./AdminWorkspace";

vi.mock("./AssignmentBoard", () => ({
  AssignmentBoard: () => <div>AssignmentBoard Mock</div>,
}));

vi.mock("./TeamsTab", () => ({
  TeamsTab: () => <div>TeamsTab Mock</div>,
}));

vi.mock("./PlayersTab", () => ({
  PlayersTab: () => <div>PlayersTab Mock</div>,
}));

vi.mock("./CoachesTab", () => ({
  CoachesTab: () => <div>CoachesTab Mock</div>,
}));

vi.mock("./RefereesTab", () => ({
  RefereesTab: () => <div>RefereesTab Mock</div>,
}));

const mockUseQuery = vi.mocked(useQuery);

describe("AdminWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockImplementation((...args) => {
      const [query] = args;
      if (query === api.admin.listClubs) {
        return [{ _id: "club-1" } as never];
      }
      if (query === api.admin.listAllTeams) {
        return [] as never;
      }
      return undefined;
    });
  });

  it("opens on Toewijzing by default", () => {
    render(<AdminWorkspace onLogout={vi.fn()} />);

    expect(screen.getByText("AssignmentBoard Mock")).toBeInTheDocument();
    expect(screen.queryByText("TeamsTab Mock")).not.toBeInTheDocument();
  });

  it("switches to Beheer and shows management tabs", () => {
    render(<AdminWorkspace onLogout={vi.fn()} />);

    fireEvent.click(screen.getByText("Beheer"));

    expect(screen.getByText("TeamsTab Mock")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Scheidsrechters"));
    expect(screen.getByText("RefereesTab Mock")).toBeInTheDocument();
  });
});
