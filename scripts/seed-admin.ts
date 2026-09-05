/**
 * Seeds the admin user directly via pg (same driver the API uses).
 * Run: npx ts-node scripts/seed-admin.ts
 */
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const rawUrl = process.env.DATABASE_URL ?? '';
  const u = new URL(rawUrl);
  u.searchParams.delete('schema');
  u.searchParams.delete('pgbouncer');

  const pool = new Pool({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });

  const email = 'impactdriver@impactdriver.org';
  const password = 'WasteWatch2026!';
  const hash = await argon2.hash(password);

  await pool.query('DELETE FROM users');

  const res = await pool.query(
    `INSERT INTO users (id, email, password_hash, role, display_name, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'ADMIN'::"UserRole", 'Admin', true, NOW(), NOW())
     RETURNING id, email, LENGTH(password_hash) AS hash_len`,
    [email, hash],
  );

  console.log('Admin user created:', res.rows[0]);
  console.log('Login with:', email, '/', password);

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
