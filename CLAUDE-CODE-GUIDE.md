# DIA Live — Claude Code Workflow Guide

## Setup

1. Clone: `git clone https://github.com/Whateverdoa/voetbal-dia-connect.git`
2. Install: `cd voetbal-dia-connect && npm install`
3. Convex: `npx convex init` (first time) or `npx convex dev` (returning)
4. Place `CLAUDE.md` and `HANDOFF.md` in repo root

## Claude Code Strengths for This Project

Use Claude Code for:
- **Backend work** — Convex functions, schema changes, seed scripts
- **Multi-file refactors** — rename patterns, update imports
- **Testing** — writing and running tests
- **Build/deploy tasks** — fixing build errors, deployment prep
- **Code review** — audit for security, performance, patterns

Use Cursor instead for:
- **Visual UI work** — seeing the page as you build it
- **Component styling** — Tailwind iteration with live preview
- **Layout work** — responsive design tweaks

## Session Templates

### Quick Fix Session (~15 min)

```bash
claude
> Read HANDOFF.md. Fix: [describe issue]. Don't change anything else.
```

### Feature Session (~1 hour)

```bash
claude
> Read HANDOFF.md and convex/schema.ts.
> Task: [describe feature]
> Approach: Start with Convex backend, then React page.
> Constraints: Must work on mobile, Dutch UI, verify PIN on mutations.
> When done, update HANDOFF.md with what changed.
```

### Review Session (~30 min)

```bash
claude
> Read all files in convex/ directory.
> Audit for:
> 1. Missing PIN checks on mutations
> 2. Queries without indexes
> 3. Data leaked between public/coach views
> 4. Missing error handling
> Report issues, propose fixes, implement if straightforward.
```

## Subagent Roles (Mental Models)

When prompting Claude Code, frame the task with one of these roles:

### 🔧 "Convex Engineer"
Focus: Backend functions, schema, data integrity
```
You are a Convex backend engineer. Focus on:
- Schema design and migrations
- Query/mutation correctness
- Index usage and performance
- PIN-based auth on every mutation
- Data isolation (public vs coach views)
```

### 📱 "Mobile UX Engineer"
Focus: Coach interface usability
```
You are building UI for a coach using a phone pitch-side in rain/cold.
- Buttons minimum 48px touch targets
- Clear visual states (who's on field, current score)
- Minimum taps per action (goal = 2-3 taps max)
- Error states visible without scrolling
```

### 🏗️ "DevOps Engineer"
Focus: Build, deploy, environment
```
You are handling build and deployment for a Next.js + Convex app on Vercel.
- Verify environment variables
- Fix build errors
- Optimize bundle size
- Set up production Convex deployment
```

### 📊 "Product Engineer"
Focus: Feature logic, playing time fairness
```
You are building the "fair playing time" feature.
- Track minutes per player per match
- Calculate at quarter boundaries
- Suggest subs based on least playing time
- Show fairness dashboard to coach
- This is the core differentiator of the app
```

## Autonomous Task Patterns

These are tasks Claude Code can run mostly autonomously:

### "Create seed data"
```
Create convex/seed.ts. Read schema.ts for the data model. Generate realistic Dutch youth football data. Make it idempotent. Export as Convex action callable with `npx convex run seed:init`.
```

### "Add error boundaries"
```
Add React error boundaries to all page-level components in src/app/. Use Next.js error.tsx pattern. Show user-friendly Dutch error messages. Log errors to console.
```

### "Type the codebase"
```
Find all `any` types in src/ and convex/. Replace with proper types using Convex generated types and React types. Don't change logic, only types. Run tsc --noEmit to verify.
```

### "Add loading states"
```
Audit all pages using useQuery. Ensure every one handles the undefined (loading) state with a proper skeleton or spinner. Use consistent loading component.
```

## File Operations Checklist

Before ending any session:

- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run build` — builds successfully
- [ ] Update HANDOFF.md — what changed, what's next
- [ ] `git add -A && git status` — review changes
- [ ] Commit with descriptive message
