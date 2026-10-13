# wastewatch-api (WasteChainMapper API)

REST API for the WasteChainMapper environmental intelligence platform. Serves geospatial dump site data, scraper reports, waste flow records, and verification workflows for Rivers State, Nigeria.

Built with NestJS, Prisma, and PostGIS on PostgreSQL.

## What it serves

| Module | Purpose |
|--------|---------|
| `reports` | Scraper-ingested news incidents awaiting verification |
| `sites` | Verified illegal dump sites with coordinates |
| `waste-flows` | Waste collection/movement records |
| `facilities` | Landfills, transfer stations, treatment facilities |
| `collection-points` | Community pickup points |
| `vehicles` | Waste collection vehicle fleet |
| `water` | Water body contamination records |
| `flood-zones` | Areas at flood/contamination risk |
| `gazetteer` | Rivers State community name → coordinate lookup |
| `analytics` | Aggregate statistics for dashboard |
| `verification` | Admin review queue for unverified reports |
| `auth` | JWT authentication for admin users |
| `api-keys` | API key management for third-party consumers |

Swagger docs available at `/api/docs` when the server is running.

## Setup

**1. Clone and install**
```bash
git clone https://github.com/your-org/wastewatch-api
cd wastewatch-api
npm install
```

**2. Environment**
```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
```

**3. Database**
```bash
npm run db:up               # start Postgres + PostGIS via Docker
npx prisma migrate dev      # apply migrations (see "Migrations on a fresh database" below)
npm run db:seed             # seed gazetteer and reference data
```

**4. Run**
```bash
npm run start:dev           # development with watch
npm run start:prod          # production (after npm run build)
```

The server starts on port `3001` by default.

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (PostGIS-enabled) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `8h`) |
| `CORS_ORIGIN` | Allowed web origin, comma separated for more than one (default `http://localhost:3000`) |
| `DATABASE_SSL` | `true` or `false`. Defaults to on for hosted databases and off for localhost |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Used by `scripts/seed-admin.ts` and, if set, `prisma/seed.ts` (password: 12+ characters) |
| `PORT` | Server port (default `3001`) |

## Database

Requires PostgreSQL with the PostGIS extension. The `docker-compose.yml` at the root spins up a local PostGIS instance. For production, use Supabase (which ships PostGIS) or a managed PostGIS instance.

The scraper (`wastewatch-scraper`) writes directly to the same database — run migrations here first.

## Setting up or upgrading the database

If the Prisma command line cannot reach your database (common with Supabase from home networks, where `prisma migrate` just hangs), use the plain SQL files. Open the Supabase **SQL editor**, paste a file, and run it.

| Your database | Run this file |
|---|---|
| Empty, no tables yet | `prisma/manual/fresh-database.sql` |
| Already has the tables | `prisma/manual/upgrade-existing-database.sql` |

The upgrade file is safe to run more than once. Both files are generated from the migrations by `node scripts/build-manual-sql.mjs`, so run that after adding a migration and commit the result.

If you do use `prisma migrate`: the first migration already creates the later Phase 2 tables and the API key table, and `20260902000000_deltaflow_atlas` and `20260903000000_api_keys` create them again. On an empty database that stops with "type already exists". Mark those two as applied first (`npx prisma migrate resolve --applied <name>`) and then run `npx prisma migrate deploy`. Do not edit the two old files: databases that applied them would report a checksum mismatch.

After pulling a schema change, run `npx prisma generate` with the API stopped. On Windows the running server locks the Prisma engine file and generate fails with EPERM.

## API keys

Every data endpoint needs an `X-API-Key` header. The exceptions are staff routes, which need a login instead, and `POST /auth/login` and `GET /api-keys/tiers`, which are open.

| Tier | Calls a day |
|---|---|
| Free | 100 |
| Professional | 5,000 |
| Enterprise | 100,000 |
| Internal | Counted, never limited. For the website only. |

A key that reaches its limit gets `429` until midnight UTC. Blocked calls are not counted, and the limit holds when many requests arrive at once.

**The website.** Visitors do not have keys, so the web app does not call this API from the browser. Its server forwards each request and adds its own Internal key (see `wastewatch-web/app/backend`). Create that key once:

```bash
npx ts-node scripts/issue-web-key.ts
```

Copy the `WEB_API_KEY=...` line it prints into `wastewatch-web/.env.local` and restart the web app. To rotate it, run the script again, update the web app, then revoke the old key on the admin API keys page.

**Partners.** Create a key on the admin API keys page and send it to them once. They call the API from their own server with the header, for example `curl -H "X-API-Key: dfa_..." https://your-api/sites`.

## Community names (gazetteer)

The scraper turns place names into map positions using the `gazetteer` table. The data comes from OpenStreetMap, not from hand-typed coordinates: `prisma/data/gazetteer-osm.json` holds every named place OpenStreetMap has for Rivers State, with its coordinates, alternative names, local government area and OSM id.

- Load it into the database: `npx ts-node scripts/load-gazetteer.ts`. It updates existing rows and adds new ones, and it is safe to run again.
- Refresh it from OpenStreetMap: `node scripts/build-gazetteer.mjs`. This takes about ten minutes because the lookup service allows one request a second.
- Ward is stored as `Unknown`, because OpenStreetMap has no ward boundaries for these places.
- Names that appear in several areas keep only the most important place of that name. Places OpenStreetMap does not have fall back to a live OpenStreetMap search at scrape time.

Place data: contains information from OpenStreetMap contributors, licensed under the ODbL. https://www.openstreetmap.org/copyright

## Hosting the API

The website on Vercel calls this API from its own server, so the API needs a public address. If the site shows "The API did not answer in time" (502) on every page, the API is not reachable from Vercel.

1. In Render, choose New, Blueprint, and pick this repository. It reads `render.yaml`.
2. Fill in `DATABASE_URL` (the Supabase transaction pooler, port 6543), `JWT_SECRET` and `CORS_ORIGIN`.
3. When it is live, open `https://<your-service>.onrender.com/api/docs`. It should load.
4. In Vercel, under the website project's Environment Variables, set `API_URL` to `https://<your-service>.onrender.com` and `WEB_API_KEY` to the website key (the same value as in `wastewatch-web/.env.local`), then redeploy.

## Importing partner spreadsheets

Operational data (tonnage, facilities, water readings) cannot be scraped. It comes from RIWAMA, contractors and utilities, usually as spreadsheets. An administrator uploads them at `/admin/import` on the website, or calls `POST /imports/:kind` (kinds: `dump-sites`, `facilities`, `waste-flows`, `water-readings`; admin sign-in required; add `?dryRun=true` to check without saving).

- Checking never saves anything. One bad row stops the whole file, and the response lists every problem with its spreadsheet row number.
- Tonnage and reading rows need a unique `reference`, so uploading the same file twice skips what is already there. Facilities match on name and type and are updated.
- At most 1000 rows per file. The rules live in `src/modules/imports/import-rules.ts`; run their tests with `npm run test:imports`.
- Needs migration `20261012010000_import_references` (included in `prisma/manual/upgrade-existing-database.sql`).

## Security notes

- Create the first admin with `scripts/seed-admin.ts`. Credentials come from environment variables and existing users are kept.
- `prisma/seed.ts` loads illustrative demo data. It refuses to run when `NODE_ENV=production`.
- Login attempts are limited per IP and email, in memory. Use a shared store if you run more than one API instance.
- Reading reports is limited to reviewers, because they are unverified and citizen messages can hold personal details.
