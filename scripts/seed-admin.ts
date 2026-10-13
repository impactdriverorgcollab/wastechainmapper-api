/**
 * Creates or updates one admin user. Existing users are never deleted.
 *
 * Run:
 *   SEED_ADMIN_EMAIL=you@example.org SEED_ADMIN_PASSWORD='a long passphrase' npx ts-node scripts/seed-admin.ts
 */
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running this script.');
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const rawUrl = process.env.DATABASE_URL ?? '';
  const u = new URL(rawUrl);
  u.searchParams.delete('schema');
  u.searchParams.delete('pgbouncer');

  const useSsl = process.env.DATABASE_SSL === 'true';
  const pool = new Pool({
    connectionString: u.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const hash = await argon2.hash(password);

  const res = await pool.query(
    `INSERT INTO users (id, email, password_hash, role, display_name, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'ADMIN'::"UserRole", 'Admin', true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'ADMIN'::"UserRole",
           is_active = true
     RETURNING id, email`,
    [email, hash],
  );

  console.log('Admin user ready:', res.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
