# Setup (Local Development Environment)

## Prerequisites

- Node.js 20+ (use `node -v` to check; Next 16 requires Node 20.9+)
- npm (ships with Node; the repo also has a `bun.lock`, but all commands below use npm)
- A PostgreSQL database. Easiest: a free [Neon](https://neon.tech) project
  (pooled connection string). Any Postgres host works — see `src/db/index.ts`.

## Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `DATABASE_URL` to your connection string.
   See [environment.md](environment.md) for details. (`.env` is git-ignored —
   never commit it.)

3. **Create tables** (pick one)
   ```bash
   npm run db:push      # push schema directly — simplest for local dev
   # or
   npm run db:migrate   # apply generated migrations from ./drizzle
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. The demo catalog (categories, products, reviews)
   seeds itself automatically on first page load via `ensureSeeded()` — no manual
   seeding step needed.

5. **Verify**
   - Home page renders products → DB connection + seeding work.
   - `GET /api/health` returns `{ "ok": true }`.
   - Optional: `npm run db:studio` opens a visual DB browser.

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (also runs type checking) |
| `npm run start` | Serve the production build locally |
| `npm run lint` | ESLint (must pass with zero errors) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Regenerate migrations after schema changes |
| `npm run db:push` / `db:migrate` | Apply schema to the database |
| `npm run db:studio` | Drizzle Studio DB browser |
