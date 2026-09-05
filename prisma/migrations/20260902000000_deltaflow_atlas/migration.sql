-- ============================================================================
-- DeltaFlow Atlas — Phase 2 schema migration
-- Adds: waste flow tracking, facilities, GPS vehicle tracking,
--       water-use monitoring, flood zones, ORGANIC/PLASTIC waste types.
--
-- HOW TO APPLY
-- 1. Run this SQL directly against your database.
-- 2. npx prisma migrate resolve --applied 20260902000000_deltaflow_atlas
-- 3. npx prisma generate
-- ============================================================================

-- 1. Extend WasteType enum with ORGANIC and PLASTIC
--    (PostgreSQL requires ALTER TYPE for enum extensions; Prisma cannot do this)
ALTER TYPE "WasteType" ADD VALUE IF NOT EXISTS 'ORGANIC';
ALTER TYPE "WasteType" ADD VALUE IF NOT EXISTS 'PLASTIC';

-- 2. New enums

CREATE TYPE "FlowStatus" AS ENUM (
  'PENDING',
  'COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'PROCESSED'
);

CREATE TYPE "FacilityType" AS ENUM (
  'COLLECTION_POINT',
  'TRANSFER_STATION',
  'RECYCLING',
  'LANDFILL',
  'INCINERATION'
);

CREATE TYPE "WaterSourceType" AS ENUM (
  'EXTRACTION',
  'DISTRIBUTION',
  'CONSUMPTION',
  'WASTEWATER'
);

CREATE TYPE "WaterAnomalyType" AS ENUM (
  'LEAK',
  'ILLEGAL_EXTRACTION',
  'CONTAMINATION'
);

CREATE TYPE "FloodRiskLevel" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- 3. Facilities — recycling plants, transfer stations, landfills, incinerators

CREATE TABLE "facilities" (
  "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
  "name"           TEXT           NOT NULL,
  "facility_type"  "FacilityType" NOT NULL,
  "location"       geography(Point, 4326),
  "latitude"       DOUBLE PRECISION,
  "longitude"      DOUBLE PRECISION,
  "operator"       TEXT,
  "capacity_tpd"   DOUBLE PRECISION,   -- tonnes per day
  "ward"           TEXT,
  "lga"            TEXT,
  "is_active"      BOOLEAN        NOT NULL DEFAULT true,
  "description"    TEXT,
  "created_at"     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "facilities_location_gist_idx" ON "facilities" USING GIST ("location");
CREATE INDEX "facilities_facility_type_idx" ON "facilities"("facility_type");
CREATE INDEX "facilities_lga_idx"           ON "facilities"("lga");
CREATE INDEX "facilities_is_active_idx"     ON "facilities"("is_active");

-- 4. Waste flows — source → collection → transfer → processing → disposal/recycling

CREATE TABLE "waste_flows" (
  "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
  "waste_type"              "WasteType"  NOT NULL DEFAULT 'UNKNOWN',
  "status"                  "FlowStatus" NOT NULL DEFAULT 'PENDING',
  "estimated_tonnage"       DOUBLE PRECISION,
  "source_site_id"          UUID,        -- dump_sites origin (nullable: may be direct pickup)
  "origin_lat"              DOUBLE PRECISION,
  "origin_lng"              DOUBLE PRECISION,
  "destination_facility_id" UUID,        -- final destination facility
  "vehicle_id"              UUID,        -- assigned collection vehicle
  "ward"                    TEXT,
  "lga"                     TEXT,
  "collected_at"            TIMESTAMPTZ,
  "in_transit_at"           TIMESTAMPTZ,
  "delivered_at"            TIMESTAMPTZ,
  "processed_at"            TIMESTAMPTZ,
  "notes"                   TEXT,
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "waste_flows_pkey"                        PRIMARY KEY ("id"),
  CONSTRAINT "waste_flows_source_site_fkey"            FOREIGN KEY ("source_site_id")          REFERENCES "dump_sites"("id"),
  CONSTRAINT "waste_flows_destination_facility_fkey"   FOREIGN KEY ("destination_facility_id") REFERENCES "facilities"("id")
);
CREATE INDEX "waste_flows_status_idx"     ON "waste_flows"("status");
CREATE INDEX "waste_flows_lga_idx"        ON "waste_flows"("lga");
CREATE INDEX "waste_flows_waste_type_idx" ON "waste_flows"("waste_type");
CREATE INDEX "waste_flows_vehicle_idx"    ON "waste_flows"("vehicle_id");

-- 5. Collection vehicles (GPS-tracked fleet)

CREATE TABLE "collection_vehicles" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "plate_number"  TEXT        NOT NULL,
  "operator"      TEXT,
  "capacity_m3"   DOUBLE PRECISION,
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "last_seen_lat" DOUBLE PRECISION,
  "last_seen_lng" DOUBLE PRECISION,
  "last_seen_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "collection_vehicles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "collection_vehicles_plate_key" ON "collection_vehicles"("plate_number");

-- 6. Vehicle route points (GPS breadcrumbs per trip)

CREATE TABLE "vehicle_route_points" (
  "id"          UUID             NOT NULL DEFAULT gen_random_uuid(),
  "vehicle_id"  UUID             NOT NULL,
  "flow_id"     UUID,
  "location"    geography(Point, 4326),
  "latitude"    DOUBLE PRECISION NOT NULL,
  "longitude"   DOUBLE PRECISION NOT NULL,
  "speed_kmh"   DOUBLE PRECISION,
  "recorded_at" TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT "vehicle_route_points_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_route_points_vehicle_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "collection_vehicles"("id"),
  CONSTRAINT "vehicle_route_points_flow_fkey"    FOREIGN KEY ("flow_id")    REFERENCES "waste_flows"("id")
);
CREATE INDEX "vehicle_route_points_location_gist_idx" ON "vehicle_route_points" USING GIST ("location");
CREATE INDEX "vehicle_route_points_vehicle_idx"       ON "vehicle_route_points"("vehicle_id");
CREATE INDEX "vehicle_route_points_flow_idx"          ON "vehicle_route_points"("flow_id");
CREATE INDEX "vehicle_route_points_recorded_at_idx"   ON "vehicle_route_points"("recorded_at");

-- 7. Water sources (extraction, distribution, consumption, wastewater points)

CREATE TABLE "water_sources" (
  "id"          UUID              NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT              NOT NULL,
  "source_type" "WaterSourceType" NOT NULL,
  "location"    geography(Point, 4326),
  "latitude"    DOUBLE PRECISION,
  "longitude"   DOUBLE PRECISION,
  "operator"    TEXT,
  "ward"        TEXT,
  "lga"         TEXT,
  "is_active"   BOOLEAN           NOT NULL DEFAULT true,
  "description" TEXT,
  "created_at"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "water_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "water_sources_location_gist_idx" ON "water_sources" USING GIST ("location");
CREATE INDEX "water_sources_source_type_idx"   ON "water_sources"("source_type");
CREATE INDEX "water_sources_lga_idx"           ON "water_sources"("lga");

-- 8. Water readings (sensor data or manual uploads)

CREATE TABLE "water_readings" (
  "id"            UUID             NOT NULL DEFAULT gen_random_uuid(),
  "source_id"     UUID             NOT NULL,
  "volume_m3"     DOUBLE PRECISION,
  "quality_score" DOUBLE PRECISION, -- 0.0–1.0 composite quality index
  "ph"            DOUBLE PRECISION,
  "turbidity_ntu" DOUBLE PRECISION,
  "is_sensor"     BOOLEAN          NOT NULL DEFAULT false,
  "notes"         TEXT,
  "recorded_at"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "created_at"    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT "water_readings_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "water_readings_source_fkey" FOREIGN KEY ("source_id") REFERENCES "water_sources"("id")
);
CREATE INDEX "water_readings_source_idx"      ON "water_readings"("source_id");
CREATE INDEX "water_readings_recorded_at_idx" ON "water_readings"("recorded_at");

-- 9. Water anomalies (leaks, illegal extraction, contamination hotspots)

CREATE TABLE "water_anomalies" (
  "id"           UUID                NOT NULL DEFAULT gen_random_uuid(),
  "source_id"    UUID,
  "anomaly_type" "WaterAnomalyType"  NOT NULL,
  "location"     geography(Point, 4326),
  "latitude"     DOUBLE PRECISION,
  "longitude"    DOUBLE PRECISION,
  "severity"     TEXT,              -- LOW, MEDIUM, HIGH
  "description"  TEXT,
  "detected_at"  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "resolved_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT "water_anomalies_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "water_anomalies_source_fkey" FOREIGN KEY ("source_id") REFERENCES "water_sources"("id")
);
CREATE INDEX "water_anomalies_location_gist_idx" ON "water_anomalies" USING GIST ("location");
CREATE INDEX "water_anomalies_anomaly_type_idx"  ON "water_anomalies"("anomaly_type");
CREATE INDEX "water_anomalies_resolved_at_idx"   ON "water_anomalies"("resolved_at");

-- 10. Flood zones (spatial polygons for risk overlay)

CREATE TABLE "flood_zones" (
  "id"          UUID              NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT,
  "risk_level"  "FloodRiskLevel"  NOT NULL DEFAULT 'MEDIUM',
  "boundary"    geography(Polygon, 4326),
  "ward"        TEXT,
  "lga"         TEXT,
  "description" TEXT,
  "source"      TEXT,             -- data provenance (e.g. NIMET, NEMA, manual)
  "created_at"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "flood_zones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "flood_zones_boundary_gist_idx" ON "flood_zones" USING GIST ("boundary");
CREATE INDEX "flood_zones_risk_level_idx"    ON "flood_zones"("risk_level");
CREATE INDEX "flood_zones_lga_idx"           ON "flood_zones"("lga");

-- 11. Register new updated_at triggers (reuses set_updated_at() from migration 1)

CREATE TRIGGER trg_facilities_updated_at
  BEFORE UPDATE ON "facilities"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_waste_flows_updated_at
  BEFORE UPDATE ON "waste_flows"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collection_vehicles_updated_at
  BEFORE UPDATE ON "collection_vehicles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_water_sources_updated_at
  BEFORE UPDATE ON "water_sources"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_flood_zones_updated_at
  BEFORE UPDATE ON "flood_zones"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
