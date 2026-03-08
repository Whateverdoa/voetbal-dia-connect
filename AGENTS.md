# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DIA Live is a Next.js 16 + Convex real-time youth football match tracking app. See `CLAUDE.md` for code conventions and `HANDOFF.md` for full architecture.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Convex backend | Self-hosted via Docker (`docker compose up -d` in `/tmp/convex-local/`) | Listens on `http://127.0.0.1:3210`. Generate admin key with `docker compose exec backend ./generate_admin_key.sh`. |
| Next.js frontend | `npm run dev:frontend` | Port 3000. Uses Turbopack. |
| Both in parallel | `npm run dev` | Runs `predev` (Convex schema sync) then both services. |

### Convex self-hosted backend setup

Convex cloud auth (`npx convex dev`) requires interactive browser login, which is unavailable in Cloud Agent VMs. Use a self-hosted Convex backend instead:

1. Start Docker daemon: `sudo dockerd &>/tmp/dockerd.log &` (if not running) and `sudo chmod 666 /var/run/docker.sock`
2. Create `/tmp/convex-local/docker-compose.yml` with the Convex backend service (image: `ghcr.io/get-convex/convex-backend:latest`, ports 3210/3211)
3. `docker compose up -d` in `/tmp/convex-local/`
4. Wait for health check: `curl -sf http://127.0.0.1:3210/version`
5. Generate admin key: `docker compose exec backend ./generate_admin_key.sh`
6. Create `.env.local` in workspace root with:
   ```
   CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
   CONVEX_SELF_HOSTED_ADMIN_KEY=<generated key>
   NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
   ```
7. Push schema: `npx convex dev --once`
8. Set admin PIN: `npx convex env set ADMIN_PIN 9999`
9. Seed data: `npx convex run "seed/index:init"`

### Key commands

Commands are documented in `HANDOFF.md` (Dev Commands section). Key ones:

- **Lint**: `npm run lint` (ESLint CLI, not `next lint` — Next.js 16 removed it)
- **Tests**: `npm run test:run` (Vitest, 406/408 pass — 2 pre-existing seed test failures)
- **Build**: `npx next build` (local) or `npm run build` (conditional build script)
- **Dev**: `npm run dev:frontend` (frontend only) or `npm run dev` (both services)

### Gotchas

- The `postinstall` script runs `npx convex codegen || true`. Without Convex configured, it fails silently (the `|| true` ensures `npm install` succeeds).
- The `predev` script (`convex dev --until-success`) blocks until Convex schema syncs. If Convex is not configured, `npm run dev` will hang. Use `npm run dev:frontend` to start just the frontend.
- Clerk auth is optional. Without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, the app shows fallback text on `/sign-in` but core PIN-based auth still works.
- Docker is required for the self-hosted Convex backend. Install Docker + fuse-overlayfs + iptables-legacy per the Cloud Agent Docker setup instructions.
- Coach PINs for testing (from seed): `1234` (Remco Hendriks, JO12-1), `5678` (Martin Nieuwenhuizen, JO12-1). Admin PIN: `9999`.
