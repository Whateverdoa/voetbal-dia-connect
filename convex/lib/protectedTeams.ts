/** Pilot roster that must not be overwritten by season imports. */
const FROZEN_JO132 = /^(j?o)?13-0*2(jm)?$/i;

export function isFrozenJo132Slug(slug: string): boolean {
  return FROZEN_JO132.test(slug.trim().replace(/\s+/g, ""));
}
