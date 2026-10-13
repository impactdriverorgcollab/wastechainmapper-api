/**
 * Creates the API key the website's server uses to call this API, and prints it once.
 * Put it in wastewatch-web/.env.local as WEB_API_KEY. It is INTERNAL: counted, never limited.
 *
 * Run: npx ts-node scripts/issue-web-key.ts
 *
 * Run it again to rotate: create a new key, update WEB_API_KEY, then revoke the old one in
 * the admin area (API keys page).
 */
import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const u = new URL(process.env.DATABASE_URL ?? '');
  u.searchParams.delete('schema');
  u.searchParams.delete('pgbouncer');

  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const ssl = process.env.DATABASE_SSL
    ? process.env.DATABASE_SSL === 'true'
    : !localHosts.has(u.hostname);
  const pool = new Pool({ connectionString: u.toString(), ssl: ssl ? { rejectUnauthorized: false } : undefined });

  const key = 'dfa_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  await pool.query(
    `INSERT INTO api_keys (id, key_hash, name, tier, daily_limit)
     VALUES (gen_random_uuid(), $1, $2, 'INTERNAL'::"ApiKeyTier", 0)`,
    [hash, `Website server (${new Date().toISOString().slice(0, 10)})`],
  );
  await pool.end();

  console.log('\nWebsite API key created. It is shown once, so copy it now:\n');
  console.log(`  WEB_API_KEY=${key}\n`);
  console.log('Add that line to wastewatch-web/.env.local and restart the web app.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
