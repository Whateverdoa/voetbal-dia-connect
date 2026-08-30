import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefereePlanningQueue } from "./RefereePlanningQueue";

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const syncCurrentAccount = vi.fn();
const bootstrapMembership = vi.fn();
const sendOffer = vi.fn();
const confirmAssignment = vi.fn();

const clubId = "club-1" as never;
const membership = {
  membershipId: "membership-1",
  clubId,
  clubName: "DIA",
  roles: ["club_admin", "planner"],
  status: "active",
  version: 1,
};
const baseNeed = {
  needId: "need-1",
  status: "open",
  version: 1,
  match: {
    matchId: "match-1",
    teamName: "JO12-1",
    opponent: "Test United",
    scheduledAt: new Date("2026-09-12T10:00:00+02:00").getTime(),
    isHome: true,
  },
  arrivalAt: new Date("2026-09-12T09:30:00+02:00").getTime(),
  expectedEndAt: new Date("2026-09-12T12:00:00+02:00").getTime(),
  venue: "Sportpark DIA",
  ageGroup: "JO12",
  matchLevel: "recreatief",
  requiredQualification: "club-jeugd",
  responseDeadline: new Date("2026-09-10T10:00:00+02:00").getTime(),
  assignmentDeadline: new Date("2026-09-11T10:00:00+02:00").getTime(),
  offers: [],
  assignment: null,
};
const profile = {
  profileId: "profile-1",
  userId: "user-referee-1",
  legacyRefereeId: null,
  displayName: "Robin Scheids",
  status: "active",
  qualificationLevel: "club-jeugd",
  privatePlannerNotes: null,
  version: 1,
};

function installQueries({
  accountSynced = true,
  memberships = [membership],
  queue = [baseNeed],
  eligible = true,
}: {
  accountSynced?: boolean;
  memberships?: typeof membership[];
  queue?: typeof baseNeed[];
  eligible?: boolean;
} = {}) {
  mockUseQuery.mockImplementation((...args) => {
    const [query, queryArgs] = args;
    if (query === api.clubIdentity.getMyM1Status) {
      return { accountSynced, memberships } as never;
    }
    if (query === api.refereeAssignmentQueries.listPlannerQueue) {
      return queue as never;
    }
    if (query === api.refereeDomain.listPlannerRefereeProfiles) {
      return [profile] as never;
    }
    if (query === api.admin.listAssignmentBoard) return [] as never;
    if (
      query === api.refereeAssignmentQueries.getPlannerCandidateEligibility &&
      queryArgs !== "skip"
    ) {
      return {
        refereeProfileId: profile.profileId,
        refereeName: profile.displayName,
        eligible,
        codes: eligible ? [] : ["REFEREE_UNAVAILABLE"],
        startsAt: baseNeed.arrivalAt,
        endsAt: baseNeed.expectedEndAt,
      } as never;
    }
    if (query === api.refereeAssignmentQueries.listNeedAudit) return [] as never;
    return undefined;
  });
}

describe("RefereePlanningQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncCurrentAccount.mockResolvedValue({});
    bootstrapMembership.mockResolvedValue({});
    sendOffer.mockResolvedValue({});
    confirmAssignment.mockResolvedValue({});
    mockUseMutation.mockImplementation((mutation) => {
      if (mutation === api.clubIdentity.syncCurrentAccount) {
        return syncCurrentAccount as never;
      }
      if (mutation === api.clubIdentity.bootstrapLegacyAdminMembership) {
        return bootstrapMembership as never;
      }
      if (mutation === api.refereeAssignmentCommands.sendOffer) {
        return sendOffer as never;
      }
      if (mutation === api.refereeAssignmentCommands.confirmAssignment) {
        return confirmAssignment as never;
      }
      return vi.fn() as never;
    });
  });

  it("activates a synchronized legacy admin as planner", async () => {
    installQueries({ accountSynced: false, memberships: [], queue: [] });
    render(<RefereePlanningQueue clubId={clubId} />);

    fireEvent.click(screen.getByRole("button", { name: "Planner activeren" }));

    await waitFor(() => expect(syncCurrentAccount).toHaveBeenCalledWith({}));
    expect(bootstrapMembership).toHaveBeenCalledWith(
      expect.objectContaining({ clubId })
    );
  });

  it("shows the server conflict and prevents sending an ineligible offer", () => {
    installQueries({ eligible: false });
    render(<RefereePlanningQueue clubId={clubId} />);

    fireEvent.change(screen.getByLabelText("Scheidsrechter"), {
      target: { value: profile.profileId },
    });

    expect(
      screen.getByText("Scheidsrechter staat als niet beschikbaar")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Offer sturen" })).toBeDisabled();
  });

  it("sends an offer only after a positive eligibility check", async () => {
    installQueries({ eligible: true });
    render(<RefereePlanningQueue clubId={clubId} />);

    fireEvent.change(screen.getByLabelText("Scheidsrechter"), {
      target: { value: profile.profileId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Offer sturen" }));

    await waitFor(() =>
      expect(sendOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          needId: baseNeed.needId,
          refereeProfileId: profile.profileId,
          needVersion: 1,
        })
      )
    );
  });

  it("requires a planner action to confirm an accepted offer", async () => {
    installQueries({
      queue: [
        {
          ...baseNeed,
          status: "awaiting_confirmation",
          version: 3,
          offers: [
            {
              offerId: "offer-1",
              refereeProfileId: profile.profileId,
              refereeName: profile.displayName,
              status: "accepted",
              sentAt: Date.now() - 60_000,
              expiresAt: Date.now() + 60_000,
              respondedAt: Date.now(),
              version: 2,
            },
          ],
        } as typeof baseNeed,
      ],
    });
    render(<RefereePlanningQueue clubId={clubId} />);

    expect(screen.getByText("Er is nog geen definitieve toewijzing gemaakt.")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Toewijzing bevestigen" })
    );

    await waitFor(() =>
      expect(confirmAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          acceptedOfferId: "offer-1",
          offerVersion: 2,
          needVersion: 3,
        })
      )
    );
  });
});
