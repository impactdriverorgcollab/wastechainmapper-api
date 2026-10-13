-- The website's own API key. It is counted but not limited, so visitors need no key while partners do.
ALTER TYPE "ApiKeyTier" ADD VALUE IF NOT EXISTS 'INTERNAL';
