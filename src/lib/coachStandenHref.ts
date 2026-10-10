/** Team poule stand for a coach; directory when no team is linked. */
export function coachStandenHref(
  teams: ReadonlyArray<{ slug?: string }>
): string {
  const slug = teams[0]?.slug;
  if (!slug) return "/teams";
  return `/team/${slug}?tab=stand`;
}
