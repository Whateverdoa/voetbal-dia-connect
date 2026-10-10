import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleViewToggle } from "./RoleViewToggle";

describe("RoleViewToggle", () => {
  it("lets an admin switch to their own role", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RoleViewToggle
        viewMode="admin"
        onChange={onChange}
        ownLabel="Coach"
        hasOwnRole
      />,
    );

    await user.click(screen.getByRole("button", { name: "Coach" }));
    expect(onChange).toHaveBeenCalledWith("own");
  });

  it("disables the own role when the account has none", () => {
    render(
      <RoleViewToggle
        viewMode="admin"
        onChange={vi.fn()}
        ownLabel="Coach"
        hasOwnRole={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Coach" })).toBeDisabled();
    expect(
      screen.getByText(/geen coach-rol/i),
    ).toBeInTheDocument();
  });
});
