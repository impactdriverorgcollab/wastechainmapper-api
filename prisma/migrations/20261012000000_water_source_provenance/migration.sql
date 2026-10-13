-- Real water points imported from public datasets (WPDx, OpenStreetMap) need to say where
-- they came from, when they were surveyed and what state they were in.
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "source_ref"        TEXT;
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "data_source"       TEXT;
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "surveyed_at"       TIMESTAMPTZ;
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "condition"         TEXT;
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "technology"        TEXT;
ALTER TABLE "water_sources" ADD COLUMN IF NOT EXISTS "population_served" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "water_sources_source_ref_key" ON "water_sources"("source_ref");
