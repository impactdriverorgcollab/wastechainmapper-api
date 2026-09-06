# wastewatch-api

REST API for the WasteWatch environmental intelligence platform. Serves geospatial dump site data, scraper reports, waste flow records, and verification workflows for Rivers State, Nigeria.

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

Swagger docs available at `/api` when the server is running.

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
npx prisma migrate dev      # apply migrations
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
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `PORT` | Server port (default `3001`) |

## Database

Requires PostgreSQL with the PostGIS extension. The `docker-compose.yml` at the root spins up a local PostGIS instance. For production, use Supabase (which ships PostGIS) or a managed PostGIS instance.

The scraper (`wastewatch-scraper`) writes directly to the same database — run migrations here first.
