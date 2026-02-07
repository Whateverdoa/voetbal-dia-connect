---
name: DIA Live Subagents
overview: "Create 8 project-level subagents in .cursor/agents/ for DIA Live, each specialized for a distinct role: testing, code review, frontend design, Convex backend, Dutch UX writing, AI agent architecture, debugging, and mobile UX auditing."
todos:
  - id: create-agents-dir
    content: Create .cursor/agents/ directory
    status: completed
  - id: test-agent
    content: Create test-agent.md -- Vitest + RTL specialist, Convex mock patterns, Dutch assertions
    status: completed
  - id: code-reviewer
    content: Create code-reviewer.md -- 300 LOC rule, TypeScript strict, PIN security, Convex patterns
    status: completed
  - id: frontend-designer
    content: Create frontend-designer.md -- Tailwind CSS 4, dia-green, mobile-first, Dutch status badges
    status: completed
  - id: convex-specialist
    content: Create convex-specialist.md -- schema, indexes, PIN auth, event sourcing, backwards-compatible migrations
    status: completed
  - id: dutch-ux-writer
    content: Create dutch-ux-writer.md -- terminology glossary, tone guide, consistent Dutch UI text
    status: completed
  - id: ai-agent-architect
    content: Create ai-agent-architect.md -- Claude tool-use, adapter pattern, voice hook, nl-NL speech
    status: completed
  - id: debugger
    content: Create debugger.md -- Convex real-time issues, PIN race conditions, mobile browser quirks
    status: completed
  - id: mobile-ux-auditor
    content: Create mobile-ux-auditor.md -- touch targets, sunlight contrast, one-handed ops, battery awareness
    status: completed
isProject: false
---

# DIA Live -- 8 Subagents Plan

All agents go into `.cursor/agents/` (project-level). Each has DIA Live context baked into its system prompt so it can operate without re-reading HANDOFF.md every time.

---

## 1. `test-agent.md` -- Test Specialist

**Purpose:** Write and maintain tests. Vitest + React Testing Library for components, manual smoke test checklists for integration flows.

**Key context to embed:**

- Tech: Vitest, React Testing Library, Convex mock patterns
- Test files live next to source: `page.test.tsx` beside `page.tsx`
- Convex hooks (`useQuery`, `useMutation`) need mocking via custom provider
- PIN auth must be tested (valid/invalid/expired)
- Match state machine: scheduled -> lineup -> live -> halftime -> finished
- Dutch UI means assertions check Dutch text ("Ongeldige PIN", "LIVE", "Afgelopen")

---

## 2. `code-reviewer.md` -- Code Review Specialist

**Purpose:** Proactively review code after edits for quality, security, and project conventions.

**Key context to embed:**

- **300 LOC hard limit** per file -- flag violations
- No `any` types in new code (TypeScript strict)
- Every Convex mutation must verify `coachPin`
- Public queries must never leak PINs
- Indexes required for all Convex queries (no table scans)
- `const` over `let`, never `var`
- Components in `src/components/`, hooks in `src/hooks/`
- Backwards-compatible schema changes only
- Check for exposed secrets, proper error handling

---

## 3. `frontend-designer.md` -- Frontend/UI Designer

**Purpose:** Build and refine UI components with Tailwind CSS 4, mobile-first, DIA branding.

**Key context to embed:**

- Tailwind CSS 4 with `dia-green` brand color
- Mobile-first: coach uses phone pitch-side
- Big touch targets (min 44x44px), clear status indicators
- React 19 + Next.js 16 App Router, all pages `"use client"`
- Status badges: Gepland (gray), Opstelling (blue), LIVE (red pulsing), Rust (orange), Afgelopen (dark)
- Dutch text throughout -- use terminology from CLAUDE.md
- `lucide-react` for icons, `clsx` for conditional classes
- No custom CSS files -- Tailwind utilities only

---

## 4. `convex-specialist.md` -- Convex Backend Specialist

**Purpose:** Design schemas, write queries/mutations, optimize indexes, ensure data integrity.

**Key context to embed:**

- Schema: 7 tables (clubs, teams, coaches, players, matches, matchPlayers, matchEvents)
- Indexes: by_slug, by_club, by_pin, by_team, by_code, by_match, by_status, by_match_type, by_match_player
- All mutations verify `coachPin` before modification
- Public queries strip sensitive fields (never return PINs)
- Match status state machine: scheduled -> lineup -> live -> halftime -> finished
- Event sourcing pattern: all actions logged as matchEvents
- Public codes: 6-char, exclude ambiguous chars (O/0/I/1)
- Schema changes must be backwards-compatible
- Use Convex generated types from `convex/_generated/`
- Files: `convex/schema.ts`, `convex/matches.ts`, `convex/matchActions.ts`, `convex/admin.ts`

---

## 5. `dutch-ux-writer.md` -- Dutch UX Writer

**Purpose:** Ensure all user-facing text is natural, consistent Dutch. Review labels, errors, confirmations, tooltips.

**Key context to embed:**

- Terminology glossary: wedstrijd=match, kwart=quarter, rust=halftime, opstelling=lineup, wissel=substitution, doelpunt=goal, tegendoelpunt=opponent goal, scheidsrechter=referee, thuiswedstrijd=home match, uitwedstrijd=away match
- Status labels: "Gepland", "Opstelling", "LIVE", "Rust", "Afgelopen"
- Error messages: "Ongeldige PIN", "Wedstrijd niet gevonden", "Geen spelers op de bank"
- Tone: friendly but concise. Coach is pitch-side, parents are casual spectators
- Never mix Dutch and English in UI text
- Code/comments stay in English
- Button labels: action-oriented ("Start wedstrijd", "Volgend kwart", "Wissel bevestigen")

---

## 6. `ai-agent-architect.md` -- AI Agent Architect

**Purpose:** Design and build the Claude tool-use agent layer: tool definitions, system prompt, adapters, voice integration.

**Key context to embed:**

- Architecture from [AGENT-ARCHITECTURE.md](AGENT-ARCHITECTURE.md): adapter pattern with Convex + WISSEL backends
- 11 tools: get_match_state, add_goal, add_opponent_goal, make_substitution, undo_last, correct_score, next_quarter, pause_match, resume_match, get_playing_time, suggest_substitutions
- Anthropic SDK, tool-use loop pattern (while stop_reason === "tool_use")
- System prompt in Dutch (the agent speaks Dutch to coaches)
- Fuzzy name matching for player lookups
- Voice: Web Speech API, `SpeechRecognition` (nl-NL), `SpeechSynthesis` for output
- API route at `/api/agent/chat` (POST)
- ConvexHttpClient for server-side Convex calls in the adapter
- Must handle tool errors gracefully ("Fout: ...")

---

## 7. `debugger.md` -- Debugger

**Purpose:** Root cause analysis for bugs, especially Convex real-time, Next.js SSR/CSR, and mobile browser issues.

**Key context to embed:**

- Common failure modes: Convex subscription stale data, PIN race conditions, publicCode collisions, browser tab sleep/wake (mobile), sessionStorage loss
- Convex dev: `npx convex dev` + Convex dashboard for data inspection
- Next.js 16 with Turbopack -- dev server quirks
- All pages are `"use client"` -- no SSR data fetching to debug
- Check `convex/_generated/` for type mismatches after schema changes
- Mobile debugging: Chrome DevTools remote for Android, Safari Web Inspector for iOS
- Match state machine violations (e.g., going from "scheduled" to "finished" directly)

---

## 8. `mobile-ux-auditor.md` -- Mobile UX Auditor

**Purpose:** Audit UI for pitch-side phone usability. Distinct from frontend-designer -- this is about field conditions.

**Key context to embed:**

- **Touch targets**: minimum 44x44px (WCAG), prefer 48x48px for gloved/wet fingers
- **Contrast**: must be readable in direct sunlight (high contrast ratios)
- **One-handed operation**: critical controls reachable with thumb on ~6" phone
- **Network resilience**: Convex handles retry, but UI must show connection state
- **Speed**: minimal taps per action (goal = 2 taps max: "GOAL" -> select scorer)
- **No accidental actions**: confirm destructive actions (end match, undo)
- **Battery**: no unnecessary animations draining battery during 70-min match
- **Orientation**: portrait lock assumed -- no landscape breakpoints needed
- **Font sizes**: minimum 16px for body, 24px+ for scores and status

---

## File Summary

All created at `.cursor/agents/`:

| File | Role | Proactive? |
|------|------|------------|
| `test-agent.md` | Write/maintain tests | After feature completion |
| `code-reviewer.md` | Review code quality | After every edit |
| `frontend-designer.md` | Build/refine UI | During UI tasks |
| `convex-specialist.md` | Backend schema/queries | During backend tasks |
| `dutch-ux-writer.md` | Dutch text quality | After UI text changes |
| `ai-agent-architect.md` | Agent layer design | During agent phase |
| `debugger.md` | Root cause analysis | When bugs arise |
| `mobile-ux-auditor.md` | Pitch-side usability | After UI changes |