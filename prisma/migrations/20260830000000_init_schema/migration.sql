-- ============================================================================
-- WasteWatch initial schema migration
-- Hand-written because Prisma cannot generate PostGIS geography types.
--
-- HOW TO APPLY
-- 1. Run this SQL directly against your database (psql, Supabase SQL editor, etc.)
-- 2. Then tell Prisma it's applied without re-running:
--    npx prisma migrate resolve --applied 20260830000000_init_schema
-- 3. Generate the Prisma client: npx prisma generate
-- ============================================================================

-- 0. PostGIS extension
--    Local: run after `docker-compose up -d` with the postgis/postgis image.
--    Supabase: also run in the SQL editor — PostGIS is pre-installed, just not enabled per DB.
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Enums

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FIELD_VERIFIER', 'PUBLIC_VIEWER');
CREATE TYPE "SiteStatus" AS ENUM ('UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REMEDIATED');
CREATE TYPE "WasteType" AS ENUM ('MUNICIPAL', 'INDUSTRIAL', 'MEDICAL', 'ELECTRONIC', 'CONSTRUCTION', 'MIXED', 'UNKNOWN');
CREATE TYPE "ConfidenceTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ReportSourceType" AS ENUM ('NEWS_SCRAPE', 'TWITTER_SCRAPE', 'WHATSAPP_CITIZEN', 'MANUAL_ENTRY');
CREATE TYPE "GeocodeStatus" AS ENUM ('PENDING', 'RESOLVED_GAZETTEER', 'RESOLVED_NOMINATIM', 'UNRESOLVED');
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'CORROBORATED', 'FIELD_VERIFIED', 'REJECTED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- 2. Tables

CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "email"         TEXT        NOT NULL,
  "password_hash" TEXT        NOT NULL,
  "display_name"  TEXT,
  "role"          "UserRole"  NOT NULL DEFAULT 'PUBLIC_VIEWER',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "dump_sites" (
  "id"                UUID             NOT NULL DEFAULT gen_random_uuid(),

  -- geography(Point, 4326): stores longitude/latitude on the WGS84 ellipsoid.
  -- ST_DWithin on geography measures distance in metres on the Earth's curved surface
  -- (not flat-plane degrees). Always pass longitude first to ST_MakePoint(lng, lat).
  "location"          geography(Point, 4326),

  -- Denormalized copies so the Prisma ORM can read coordinates without raw SQL.
  -- Keep in sync with `location` on every write.
  "latitude"          DOUBLE PRECISION,
  "longitude"         DOUBLE PRECISION,

  "status"            "SiteStatus"     NOT NULL DEFAULT 'UNVERIFIED',
  "waste_type"        "WasteType"      NOT NULL DEFAULT 'UNKNOWN',
  "confidence_tier"   "ConfidenceTier" NOT NULL DEFAULT 'LOW',
  "source_report_ids" UUID[]           NOT NULL DEFAULT '{}',
  "community_name"    TEXT,
  "ward"              TEXT,
  "lga"               TEXT,
  "description"       TEXT,
  "image_urls"        TEXT[]           NOT NULL DEFAULT '{}',
  "first_seen_at"     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "last_confirmed_at" TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT "dump_sites_pkey" PRIMARY KEY ("id")
);
-- GIST index enables fast spatial queries. Required — without it ST_DWithin is a full table scan.
CREATE INDEX "dump_sites_location_gist_idx" ON "dump_sites" USING GIST ("location");
CREATE INDEX "dump_sites_lga_idx"             ON "dump_sites"("lga");
CREATE INDEX "dump_sites_ward_idx"            ON "dump_sites"("ward");
CREATE INDEX "dump_sites_confidence_tier_idx" ON "dump_sites"("confidence_tier");

CREATE TABLE "collection_points" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "location"          geography(Point, 4326),
  "latitude"          DOUBLE PRECISION,
  "longitude"         DOUBLE PRECISION,
  "name"              TEXT        NOT NULL,
  "operator"          TEXT,
  "ward"              TEXT,
  "lga"               TEXT,
  "is_active"         BOOLEAN     NOT NULL DEFAULT true,
  "coverage_radius_m" DOUBLE PRECISION,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "collection_points_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "collection_points_location_gist_idx" ON "collection_points" USING GIST ("location");
CREATE INDEX "collection_points_lga_idx"           ON "collection_points"("lga");

CREATE TABLE "reports" (
  "id"                      UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "raw_text"                TEXT                 NOT NULL,
  "source_url"              TEXT,
  "source_type"             "ReportSourceType"   NOT NULL,
  "extracted_location_text" TEXT,
  "extracted_waste_type"    "WasteType",
  "extracted_severity"      TEXT,
  "extracted_urgency"       TEXT,
  "geocode_status"          "GeocodeStatus"      NOT NULL DEFAULT 'PENDING',
  "geocoded_latitude"       DOUBLE PRECISION,
  "geocoded_longitude"      DOUBLE PRECISION,
  "geocode_source"          TEXT,
  "confidence_score"        DOUBLE PRECISION,
  "verification_status"     "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "linked_site_id"          UUID,
  "published_at"            TIMESTAMPTZ,
  "scraped_at"              TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "created_at"              TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reports_linked_site_id_fkey" FOREIGN KEY ("linked_site_id") REFERENCES "dump_sites"("id")
);
CREATE INDEX "reports_geocode_status_idx"      ON "reports"("geocode_status");
CREATE INDEX "reports_verification_status_idx" ON "reports"("verification_status");
CREATE INDEX "reports_source_type_idx"         ON "reports"("source_type");
CREATE INDEX "reports_linked_site_id_idx"      ON "reports"("linked_site_id");

CREATE TABLE "verifications" (
  "id"          UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "report_id"   UUID,
  "site_id"     UUID,
  "verifier_id" UUID                 NOT NULL,
  "from_status" "VerificationStatus" NOT NULL,
  "to_status"   "VerificationStatus" NOT NULL,
  "notes"       TEXT,
  "created_at"  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  CONSTRAINT "verifications_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "verifications_report_id_fkey"  FOREIGN KEY ("report_id")   REFERENCES "reports"("id"),
  CONSTRAINT "verifications_site_id_fkey"    FOREIGN KEY ("site_id")     REFERENCES "dump_sites"("id"),
  CONSTRAINT "verifications_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id")
);

CREATE TABLE "gazetteer" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "community_name" TEXT       NOT NULL,
  "ward"          TEXT        NOT NULL,
  "lga"           TEXT        NOT NULL,
  -- Centroid used for geocoding resolution (point-in-polygon or nearest-community lookup)
  "centroid"      geography(Point, 4326),
  "centroid_lat"  DOUBLE PRECISION,
  "centroid_lng"  DOUBLE PRECISION,
  -- Polygon boundary for ward-level containment queries (optional — seed later)
  "boundary"      geography(Polygon, 4326),
  "aliases"       TEXT[]      NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "gazetteer_pkey"                    PRIMARY KEY ("id"),
  CONSTRAINT "gazetteer_community_ward_lga_key"  UNIQUE ("community_name", "ward", "lga")
);
CREATE INDEX "gazetteer_centroid_gist_idx" ON "gazetteer" USING GIST ("centroid");
CREATE INDEX "gazetteer_boundary_gist_idx" ON "gazetteer" USING GIST ("boundary");
CREATE INDEX "gazetteer_lga_idx"           ON "gazetteer"("lga");
CREATE INDEX "gazetteer_ward_idx"          ON "gazetteer"("ward");

CREATE TABLE "scrape_jobs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "job_type"     TEXT        NOT NULL,
  "status"       "JobStatus" NOT NULL DEFAULT 'PENDING',
  "started_at"   TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "error_msg"    TEXT,
  "metadata"     JSONB,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scrape_jobs_status_idx" ON "scrape_jobs"("status");

-- 3. updated_at trigger
--    Prisma normally manages updated_at in the ORM layer. Because the Python scraper
--    writes directly to Postgres without Prisma, we add a DB-level trigger so the column
--    stays accurate regardless of which service performs the write.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dump_sites_updated_at
  BEFORE UPDATE ON "dump_sites"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collection_points_updated_at
  BEFORE UPDATE ON "collection_points"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON "reports"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gazetteer_updated_at
  BEFORE UPDATE ON "gazetteer"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
