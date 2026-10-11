import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignInGateway } from "./SignInGateway";

vi.mock("@clerk/nextjs", () => ({
  SignIn: ({ fallbackRedirectUrl }: { fallbackRedirectUrl: string }) => (
    <div>{`Clerk SignIn -> ${fallbackRedirectUrl}`}</div>
  ),
}));

describe("SignInGateway", () => {
  it("shows fallback copy when Clerk is disabled", () => {
    render(<SignInGateway clerkEnabled={false} />);

    expect(screen.getByText("Inloggen is nog niet actief")).toBeInTheDocument();
    expect(screen.getByText("Naar admin")).toBeInTheDocument();
  });

  it("renders the Clerk sign-in component when Clerk is enabled", () => {
    render(<SignInGateway clerkEnabled />);

    expect(screen.getByText("Clerk SignIn -> /onboarding/rol")).toBeInTheDocument();
  });

  it("returns invited members to the portal without staff onboarding", () => {
    render(<SignInGateway clerkEnabled returnTo="/team/jo13-1/app/invite/token" />);
    expect(screen.getByText("Clerk SignIn -> /team/jo13-1/app/invite/token")).toBeInTheDocument();
    expect(screen.getByText("Log in voor je team")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Naar admin" })).not.toBeInTheDocument();
  });

  it("rejects an external return destination", () => {
    render(<SignInGateway clerkEnabled returnTo="https://evil.example" />);
    expect(screen.getByText("Clerk SignIn -> /onboarding/rol")).toBeInTheDocument();
  });
});

