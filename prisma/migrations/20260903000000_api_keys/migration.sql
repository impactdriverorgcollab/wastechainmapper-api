-- DeltaFlow Atlas: API key management for private-sector licensing
-- Revenue model: tiered API access (Free / Professional / Enterprise)

CREATE TYPE "ApiKeyTier" AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');

CREATE TABLE "api_keys" (
  "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "key_hash"     TEXT        UNIQUE NOT NULL,
  "name"         TEXT        NOT NULL,
  "tier"         "ApiKeyTier" NOT NULL DEFAULT 'FREE',
  "calls_today"  INTEGER     NOT NULL DEFAULT 0,
  "calls_total"  INTEGER     NOT NULL DEFAULT 0,
  "daily_limit"  INTEGER     NOT NULL DEFAULT 100,
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "owner_id"     UUID,
  "last_used_at" TIMESTAMPTZ,
  "reset_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "api_keys_is_active_idx" ON "api_keys"("is_active");
CREATE INDEX "api_keys_tier_idx"      ON "api_keys"("tier");

-- Ensure the helper exists (safe to re-run if init migration already created it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- updated_at trigger
CREATE TRIGGER "api_keys_updated_at"
  BEFORE UPDATE ON "api_keys"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
