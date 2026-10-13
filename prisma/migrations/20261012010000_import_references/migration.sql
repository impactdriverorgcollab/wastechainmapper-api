-- Partner spreadsheets (tonnage logs, water readings) are keyed by a reference column, so
-- uploading the same file twice skips what is already there instead of counting it twice.
ALTER TABLE "waste_flows"    ADD COLUMN IF NOT EXISTS "source_ref" TEXT;
ALTER TABLE "water_readings" ADD COLUMN IF NOT EXISTS "source_ref" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "waste_flows_source_ref_key"    ON "waste_flows"("source_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "water_readings_source_ref_key" ON "water_readings"("source_ref");
