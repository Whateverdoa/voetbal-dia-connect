/**
 * Shared claim-pool membership check (strict opt-in via inClaimPool === true).
 */
export function isRefereeInClaimPool(referee: {
  active: boolean;
  inClaimPool?: boolean;
}): boolean {
  return referee.active && referee.inClaimPool === true;
}
