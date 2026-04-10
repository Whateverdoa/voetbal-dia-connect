# Actors, access, and public privacy (DIA Live)

Developer-oriented overview: who can do what, where it is enforced, and how club provisioning works. End-user copy lives under `/help` in the app.

## Actor types

| Actor | Auth | Typical UI |
| --- | --- | --- |
| Admin / TC | Clerk + Convex `admin` | `/admin` |
| Coach | Clerk + Convex `coach` + `coaches` row | `/coach`, `/coach/match/[id]` |
| Referee (domain name) | Clerk + Convex `referee` + `referees` row | `/scheidsrechter`, `/scheidsrechter/match/[id]` |
| Match lead | Same as coach; per-match `matches.leadCoachId` | Coach match UI (e.g. substitutions) |
| Public (parents, guardians, supporters) | None | `/`, `/live/[code]` — read-only |

In user-facing Dutch we often call the referee role **wedstrijdbegeleider** (parent/volunteer operating clock and score). The Convex role literal remains `referee` and routes keep `/scheidsrechter` unless renamed in a dedicated migration.

## Two layers: Clerk (routes) vs Convex (data)

1. **Clerk** — `publicMetadata.role` (legacy) or `publicMetadata.roles[]`. Parsed in [`src/lib/auth/roles.ts`](../src/lib/auth/roles.ts) and enforced in [`src/middleware.ts`](../src/middleware.ts) for `/admin`, `/coach`, `/scheidsrechter`, and `/onboarding/rol`.
2. **Convex** — [`convex/lib/userAccess.ts`](../convex/lib/userAccess.ts) resolves **effective** access by merging:
   - Optional persisted `userAccess` document (by email), and
   - **Derived** access from `coaches` / `referees` (by normalized Clerk identity email) and bootstrap admin emails (`CLERK_BOOTSTRAP_ADMIN_EMAILS`).

Mutations use `requireRole`, `requireCoachForMatch`, `requireRefereeForMatch`, etc. Do not assume Clerk metadata alone is the source of truth for Convex.

## Club provisioning (single-club deployment)

- **Coach**: a row in `coaches` with `email` equal to the person’s Clerk primary email; `teamIds` set.
- **Referee**: a row in `referees` with matching `email` and `active: true`.
- **Admin**: often bootstrap list + `userAccess` / internal tools; see [`docs/roles.md`](roles.md).

The club does not “assign roles inside the login UI”; they maintain **correct emails** in Convex (admin UI) so that after Clerk login the merge yields the right roles.

## Public / privacy

- **No account** for spectators. Queries in [`convex/publicQueries.ts`](../convex/publicQueries.ts) and [`getByPublicCode` in `convex/matches.ts`](../convex/matches.ts) must not expose internal names for assigned officials unless product explicitly allows it.
- **`refereeAssigned`**: boolean derived from `matches.refereeId != null` — indicates a match official is assigned **without** exposing the `referees.name` field on public payloads.

## External data (Sportlink / imports)

- Club match/program data may be imported (e.g. VoetbalAssist flow in [`HANDOFF.md`](../HANDOFF.md)). That is separate from Clerk identity.
- Optional Sportlink Club.Dataservice integration is described in [`docs/sportlink-integration.md`](sportlink-integration.md) and [`docs/knvb-sportlink-capabilities.md`](knvb-sportlink-capabilities.md).

## Related docs

- [`docs/roles.md`](roles.md) — Clerk metadata, bootstrap, onboarding.
- [`HANDOFF.md`](../HANDOFF.md) — product architecture and import behaviour.
