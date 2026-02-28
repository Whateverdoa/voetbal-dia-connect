---
name: ios-native-migration-planner
description: Plans native iOS (Swift/SwiftUI) migration for DIA Live. Produces feature parity matrices, architecture decisions, milestone plans, and risk checklists. Use when converting to Apple apps, planning iOS migration, App Store prep, or Swift native development.
---

# iOS Native Migration Planner

## When to Apply

Use this skill when the user asks about:
- Converting DIA Live (or this web app) to an iOS/Apple app
- Swift, SwiftUI, or native iOS development
- App Store submission or TestFlight
- iOS migration planning, feature parity, or architecture for the Convex backend

## Planning Workflow

Follow this sequence when producing a migration plan:

1. **Discovery** — Identify source features from `HANDOFF.md` and `src/app/` routes. List public, coach, and referee flows.
2. **Feature parity matrix** — Map each web feature to an iOS equivalent; assign priority (P0/P1/P2).
3. **Architecture decisions** — Document Convex integration (HTTP API vs future SDK), offline strategy, auth (PIN) handling.
4. **Milestone plan** — Phased delivery (e.g., Phase 1: public live view, Phase 2: coach control, Phase 3: referee).
5. **Risks** — Connectivity pitch-side, Convex Swift support, App Store review requirements.

## Migration Plan Output Template

```markdown
# iOS Migration Plan — DIA Live

## 1. Scope
- **Source**: voetbal-dia-connect (Next.js + Convex)
- **Target**: Native Swift/SwiftUI

## 2. Feature Parity Matrix
| Feature | Web | iOS | Priority |
|---------|-----|-----|----------|
| [feature] | [route/description] | [planned approach] | P0/P1/P2 |

## 3. Architecture Decisions
- Convex: [HTTP client / SDK status]
- Auth: PIN-based, no change
- Offline: [strategy]

## 4. Milestones
- **M1**: [description] — [deliverables]
- **M2**: [description] — [deliverables]
- **M3**: [description] — [deliverables]

## 5. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| [risk] | [mitigation] |
```

## Backlog Template

```markdown
## iOS Migration Backlog
- [ ] Set up Xcode project, SwiftUI
- [ ] Convex HTTP adapter (queries: getByPublicCode, listPublicMatches)
- [ ] Public live view screen
- [ ] Coach PIN login
- [ ] Match control (lineup, goals, subs, clock)
- [ ] TestFlight + App Store prep
```

## Key DIA Live Terms (Dutch)

| Term | Dutch | Context |
|------|-------|---------|
| Match | Wedstrijd | Core entity |
| Quarter | Kwart | Match flow |
| Lineup | Opstelling | Coach flow |
| Goal | Doelpunt | Event |
| Substitution | Wissel | Event |
| Referee | Scheidsrechter | Separate role |
