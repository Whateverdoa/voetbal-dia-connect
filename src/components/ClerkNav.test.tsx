import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/convex/_generated/api";
import { ClerkNav } from "./ClerkNav";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@/hooks/useAppNavHeight", () => ({ useAppNavHeight: () => undefined }));
vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
  SignUpButton: ({ children }: PropsWithChildren) => children,
  UserButton: () => null,
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ user: { publicMetadata: {}, primaryEmailAddress: { emailAddress: "ouder@example.nl" } }, isSignedIn: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = "/";
  vi.mocked(useQuery).mockImplementation((...args) => args[0] === api.userQueries.getMyRoles ? { roles: [] } : [{ teamId: "t1", teamName: "JO13-1", teamSlug: "jo13-1" }]);
});

describe("member account navigation", () => {
  it("adds the team link without granting or displaying any staff role", () => {
    render(<ClerkNav />);
    expect(screen.getByRole("link", { name: "Mijn team" })).toHaveAttribute("href", "/team/jo13-1/app");
    expect(screen.queryByRole("link", { name: "Coach" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Scheidsrechter" })).not.toBeInTheDocument();
  });

  it.each(["/sign-in", "/sign-up", "/sign-in/sso-callback"])("leaves cross-auth links to the invitation-aware widget on %s", (pathname) => {
    navigation.pathname = pathname;
    const { container } = render(<ClerkNav />);
    expect(container).toBeEmptyDOMElement();
    expect(useQuery).not.toHaveBeenCalled();
  });
});
