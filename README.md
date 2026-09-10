# DeshiCart — Trendy Fashion for Bangladesh

DeshiCart is a full-stack fashion e-commerce storefront: browse a curated catalog
of t-shirts, shirts, women's wear and accessories, filter and search, manage a
cart, check out as a guest (COD / bKash / card), and leave product reviews.
Prices are in Bangladeshi Taka (৳).

## Features

- **Storefront home** — hero, collection tiles, featured products, brand story,
  testimonials, newsletter signup
- **Shop catalog** — category pills, text search (`?q=`), price ranges, and sorting
  (featured, newest, price ↑↓, top rated)
- **Product pages** — image gallery, size/color selection, discount badges, rating
  distribution, customer reviews + review submission, related products
- **Cart drawer** — slide-in cart with quantity controls, persisted to
  `localStorage`
- **Guest checkout** — contact + delivery address form, payment method choice,
  server-side price recomputation, order confirmation page (`/order/[id]`)
- **Auto-seeding demo catalog** — categories, products, and reviews seed themselves
  on first run against an empty database
- **Health endpoint** — `GET /api/health` for uptime checks

## Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19), Tailwind CSS v4,
  `next/font/google` (Fraunces + Manrope)
- **Backend:** Next.js Route Handlers (`/api/orders`, `/api/reviews`, `/api/health`);
  no separate server, no auth (guest checkout)
- **Database:** Hosted PostgreSQL (Neon) via Drizzle ORM
  (`drizzle-orm` + `@neondatabase/serverless` over HTTPS, `node-postgres` pool
  for non-Neon hosts); migrations via `drizzle-kit`
- **Infrastructure:** Vercel (serverless, Node runtime); images served from the
  Pexels CDN with plain `<img>` tags

## Installation

Prerequisites: Node.js 20+, npm, and a PostgreSQL database (a free Neon project
with a pooled connection string is the easiest path).

```bash
npm install
cp .env.example .env        # then set DATABASE_URL in .env
npm run db:push             # create tables (or: npm run db:migrate)
npm run dev                 # http://localhost:3000
```

The demo catalog seeds automatically on first page load. Full walkthrough:
[docs/setup.md](docs/setup.md).

## Environment Variables

Only one variable is used:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string (app + drizzle-kit) |

Copy `.env.example` → `.env` locally; on Vercel set it under Project → Settings →
Environment Variables. Details, examples, and secret-hygiene notes:
[docs/environment.md](docs/environment.md).

## Local Development

```bash
npm run dev        # dev server → http://localhost:3000
npm run lint       # ESLint — must pass clean
npm run typecheck  # tsc --noEmit
npm run db:studio  # visual database browser
```

Conventions, workflows, and how to add pages / APIs / schema changes:
[docs/development.md](docs/development.md).

## Build

```bash
npm run build   # production build (includes type checking)
npm run start   # serve the production build locally
```

## Deployment

Push to GitHub, import into Vercel (Next.js preset, defaults), set `DATABASE_URL`,
and deploy. The `vercel-build` script syncs the DB schema automatically on every
deployment; no `vercel.json` needed. Step-by-step guide with production checklist
and rollback procedure:
[docs/deployment.md](docs/deployment.md).

## Troubleshooting

Common issues (build failures, missing env vars, DB connection problems, Vercel
failures, runtime errors): [docs/troubleshooting.md](docs/troubleshooting.md).
API reference: [docs/api.md](docs/api.md). Architecture overview:
[docs/architecture.md](docs/architecture.md).

> **Demo disclaimer:** payments are labels only (no gateway integration — nothing
> is charged), checkout is guest-only with no authentication, and order pages are
> reachable by sequential id. Review the production checklist in
> [docs/deployment.md](docs/deployment.md) before handling real customer data.
