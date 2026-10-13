-- 1. Fuzzy community lookup (GET /gazetteer/lookup) calls similarity(), which needs pg_trgm.
--    Without the extension that endpoint fails with "function similarity does not exist".
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Articles the scraper has already processed, relevant or not.
--    Before this table the scraper only skipped URLs already saved as reports, so every
--    run sent the same irrelevant articles to the language model again, and clean-up
--    articles (which create waste flows, not reports) were processed again each run.
CREATE TABLE IF NOT EXISTS "seen_articles" (
  "url"         TEXT         NOT NULL,
  "source"      TEXT,
  "outcome"     TEXT         NOT NULL,
  "first_seen"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "seen_articles_pkey" PRIMARY KEY ("url")
);
