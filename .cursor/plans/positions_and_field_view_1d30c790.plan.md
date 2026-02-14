---
name: Positions and field view
overview: "Summarize remaining HANDOFF todos, then define the next-MVP feature: player positions (two per player), visual field placement for coaches, formation/pitch-type support (6/8/11, full/half), and position-aware substitution suggestions that can be overridden."
todos: []
isProject: false
---

# HANDOFF todos + Positions & field view (next iteration)

## 1. What's left from HANDOFF.md

**Synced with updated HANDOFF.** Current State in HANDOFF now shows as **completed**: Public match browser (homepage MatchBrowser, `listPublicMatches`), Standen page (`/standen`, scoreboard with `?team=` / `?vandaag=true`), Wedstrijdleider Phase 1 (claim/release match lead, `leadCoachId` on matches, `MatchLeadBadge`). Data model mentions `matches.leadCoachId`. The Completed Features list in HANDOFF reflects these; they are not in the TODO table. The remaining work below is unchanged.

From [HANDOFF.md](HANDOFF.md) (sections "TODO — Priority Task List" and "Follow-Up Items"):

**High priority (not started)**

- **Admin Match Management** — Matches tab in Admin: create, edit, delete matches; admins manage calendar without coach PIN.
- **Bulk Match Import** — CSV/JSON import for season scheduling.

**Medium priority (not started)**

- **Coach Match Delete** — Coaches can delete their own scheduled (not started) matches.
- **Match Edit (Admin)** — Edit opponent, date, time, referee assignment.
- **Cascade Delete** — On match delete, remove related `matchPlayers` and `matchEvents`.

**Low / future**

- PWA, Match History Stats, Mobile UX Audit, Named Login, Cumulative Clock.

**Critical security (follow-up)** — RESOLVED

- ~~**Admin PIN in client bundle**~~ — **Done** (commit 0b4ca7e). Admin login now uses server-side `convex.query(verifyAdminPinQuery, { pin })`; PIN lives only in Convex `process.env.ADMIN_PIN`. Session stores verified PIN for mutations; `NEXT_PUBLIC_ADMIN_PIN` removed. HANDOFF.md updated to "Critical — Security (RESOLVED)".

**Warnings (code quality)**

- `as Id<"players">` casts in `convex/teams.ts`; seed PIN hardcoded in `convex/seed.ts`.

The **ai-agent-architect** agent describes the voice/Claude tool-use layer (tools, system prompt, Convex adapter, voice hook). That work is separate from the HANDOFF task list; HANDOFF does not list "agent implementation" as a todo. So the **remaining HANDOFF todos** are the items above (admin match management, bulk import, coach delete, cascade delete, etc.); the admin PIN security fix is done.

---

## 2. New feature: player positions and field view (next MVP iteration)

This ties directly into substitutions: today the coach only sees "players on field" vs "on bench" as lists, and substitution suggestions are based only on playing time. You want:

- **Two positions per player** (e.g. striker + left forward, mid + mid).
- **Visual field** where coaches place and see players (primary for coaches).
- **Pitch type / formation**: full field vs half field; support for 6 (optional), 8 (3-3-1, 1-4-2-1, 1-3-2-2), and 11.
- **Smarter substitution suggestions**: prefer same/similar position; overridable; for bigger teams (e.g. 11) more strict (e.g. avoid suggesting striker ↔ left back).

You've tried similar things before, so the plan aims for a **minimal, backwards-compatible** design that can be introduced stepwise.

### 2.0 Tech stack for field view (mobile-first)

**Recommended: SVG + Tailwind + @dnd-kit**

- **SVG** — A pitch has a fixed aspect ratio. Use `viewBox="0 0 100 150"` (or similar) so the field and player positions scale correctly on all screens (iPhone SE to iPad) without complex CSS `calc()`. Tailwind classes work inside SVG (e.g. `<circle className="fill-dia-green" />`).
- **@dnd-kit** — Use for React drag-and-drop; it's the standard and works well on touch. Install as dependency for the pitch component.
- **Tap-to-Move** — On mobile, also support "tap slot → tap player" (and optionally "tap player → tap slot"). Dragging with wet fingers pitch-side is error-prone; tap-to-move is the primary mobile interaction, drag is a bonus.

**Handoff for subagents:** convex-specialist owns schema + seed + substitution query; frontend-designer owns `PitchView` (SVG), formation config, and Tap-to-Move UI.

### 2.1 Data model (backwards-compatible)

**Players (team-level, optional)**

- In [convex/schema.ts](convex/schema.ts), extend `players` with optional fields:
- `positionPrimary: v.optional(v.string())` — fixed codes, e.g. `"K"` (Keeper), `"V"` (Verdediger), `"M"` (Midden), `"A"` (Aanval). Short codes keep schema and logic simple; UI can show Dutch labels.
- `positionSecondary: v.optional(v.string())` — second role, same code set.
- Single source of truth for codes (e.g. `src/lib/positions.ts` or convex constant). Existing players work without positions.

**MatchPlayers (field slot, optional)**

- Add `fieldSlotIndex: v.optional(v.number())` — which slot on the field (0 = keeper, 1..N = outfield slots in a fixed order per formation).
- If absent, behaviour stays "list only" (no field placement).
- When coach assigns a player to a slot on the field, set `fieldSlotIndex`; when they move to bench, clear it.

**Match (pitch/formation choice)**

- Add to `matches`:
- `pitchType: v.optional(v.union(v.literal("full"), v.literal("half")))` — full field vs half field.
- `formationId: v.optional(v.string())` — ID references front-end config (e.g. `"8v8_3-3-1"`, `"11v11_4-3-3"`). No enum in schema; frontend owns the list.

**Formation definitions (frontend)**

- Single config file [src/lib/formations.ts](src/lib/formations.ts): each formation has a key (e.g. `"8v8_3-3-1"`), display name, and `slots` array. Each slot: `{ id: number, x: number, y: number, role: "K"|"V"|"M"|"A" }` in normalized coordinates (e.g. 0–100) for the SVG viewBox. Example: keeper at (50, 90), backs at (20,70), (50,70), (80,70), etc. `fieldSlotIndex` on matchPlayers maps to `slot.id`.

### 2.2 Coach UI: field view first

- **Primary view** = `<PitchView />`: SVG pitch (viewBox e.g. 0 0 100 150) + slot circles; "on field" players in slots, "on bench" below or beside (as now).
- **Interaction:** Tap-to-Move first on mobile (tap slot → tap player, or tap player → tap slot). Drag-and-drop via @dnd-kit for desktop/tablet.
- **Formation selector:** "Veld: half / vol", "Formatie: 3-3-1, 1-4-2-1, …" so slot count fits team size (6/8/11).
- **List view** remains available (tab or toggle) for coaches who don't use formations.
- Mutations: assign player to slot → set `onField: true` and `fieldSlotIndex`; move to bench → clear `fieldSlotIndex`, `onField: false`. Reuse/expand existing lineup mutations.

### 2.3 Position-aware substitution suggestions

- In [convex/matchQueries.ts](convex/matchQueries.ts), update `getSuggestedSubstitutions`:
  - **Current:** sort by playing time only (most on field out, least on bench in).
  - **New logic:** For each "player out" (e.g. by most minutes): (1) Filter bench by `positionPrimary` (or `positionSecondary`) match with player out. (2) Sort that subset by playing time (least first). (3) Use that as preferred "player in". **Fallback:** if no position match, use bench sorted by least playing time as now.
- **Overridable:** Coach can always do any sub manually; suggestions only *prefer* position-aware pairs.
- **11-a-side:** For full team, rank by position match first, then time, so e.g. striker ↔ left back appears lower or not in top 3.

### 2.4 Implementation order (for subagents)

(Security fix is done: commit 0b4ca7e — server-side PIN only.)

1. **Backend (convex-specialist)** — Schema: add optional `positionPrimary`, `positionSecondary` to `players` (codes K/V/M/A); optional `fieldSlotIndex` to `matchPlayers`; optional `pitchType`, `formationId` to `matches`. Update seed with sample positions. No migration needed (all optional).
2. **Position codes** — `src/lib/positions.ts` (or shared constant): codes K, V, M, A + Dutch labels + optional role grouping for suggestion logic.
3. **Formation definitions** — `src/lib/formations.ts`: formations keyed by e.g. `8v8_3-3-1`, each with `name` and `slots: [{ id, x, y, role }]` for SVG.
4. **Frontend (frontend-designer)** — `<PitchView />`: SVG with viewBox, pitch lines, slot circles; Tailwind where applicable; @dnd-kit for drag; **Tap-to-Move** (tap slot → tap player) as primary on mobile.
5. **Coach match page** — Formation/pitch selector; field view as default or first tab; list view toggle. Mutations: assign to slot (set `fieldSlotIndex` + `onField`), clear slot (clear `fieldSlotIndex`, `onField: false`).
6. **Admin/coach player edit** — Add "Positie 1" and "Positie 2" dropdowns (from position codes).
7. **Substitution suggestions** — In `getSuggestedSubstitutions`: filter bench by position match with player out, sort by time; fallback time-only; keep manual sub unrestricted.
8. **Voice/agent (later)** — Reuse same query for `suggest_substitutions`; no schema change.

### 2.5 Risks and mitigations

- **Scope creep** — Stick to two positions per player and a fixed set of formations; avoid "free draw" or custom formations in v1.
- **Backwards compatibility** — All new fields optional; existing matches and players work without positions or field slots.
- **Mobile** — Field view must work on small screens (big touch targets, scroll if needed).
- **Overriding subs** — UI must always allow "player out / player in" without restricting to suggested pairs; position logic is for suggestions only.

### 2.6 Out of scope for this iteration

- Public live view showing positions on a field (optional later).
- Automatic formation detection from slot positions.
- More than two positions per player.
- Custom formations by the coach.

---

## 3. Summary

- **HANDOFF todos left:** Admin Match Management (and bulk import) high; Coach Match Delete, Match Edit, Cascade Delete medium; PWA, stats, UX audit, etc. low. Admin PIN security fix done (0b4ca7e).
- **New feature for next iteration:** Player positions (K/V/M/A primary + secondary), optional field slots per match player, pitch type + formation on match (`formationId` e.g. `8v8_3-3-1`), **field-first coach UI** (SVG + Tailwind + @dnd-kit, Tap-to-Move on mobile), formation config in `src/lib/formations.ts`, and **position-aware substitution suggestions** (filter bench by position match → time sort → fallback). Implementation: backend (schema + seed + query) then frontend (PitchView).
