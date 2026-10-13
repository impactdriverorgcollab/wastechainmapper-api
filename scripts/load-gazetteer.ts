/**
 * Loads prisma/data/gazetteer-osm.json into the gazetteer table.
 *
 *   npx ts-node scripts/load-gazetteer.ts            add new places and update existing ones
 *   npx ts-node scripts/load-gazetteer.ts --replace  also delete rows that are not in the file
 *
 * Safe to run again. Without --replace nothing is deleted, but the script lists any rows left
 * over from older, hand-typed seeds so you can decide.
 *
 * Data: contains information from OpenStreetMap contributors, ODbL.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface Entry {
  name: string;
  lga: string;
  ward: string;
  lat: number;
  lng: number;
  aliases: string[];
  osmId: string;
}

async function main() {
  const replace = process.argv.includes('--replace');
  const file = path.resolve(__dirname, '../prisma/data/gazetteer-osm.json');
  if (!fs.existsSync(file)) throw new Error('prisma/data/gazetteer-osm.json is missing. Run: node scripts/build-gazetteer.mjs');
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { entries: Entry[]; retrievedAt: string };

  const u = new URL(process.env.DATABASE_URL ?? '');
  u.searchParams.delete('schema');
  u.searchParams.delete('pgbouncer');
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const ssl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL === 'true' : !localHosts.has(u.hostname);
  const pool = new Pool({ connectionString: u.toString(), ssl: ssl ? { rejectUnauthorized: false } : undefined });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let written = 0;
    for (const e of data.entries) {
      await client.query(
        `INSERT INTO gazetteer (community_name, ward, lga, centroid, centroid_lat, centroid_lng, aliases)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5::float8, $4::float8), 4326)::geography, $4::float8, $5::float8, $6::text[])
         ON CONFLICT (community_name, ward, lga) DO UPDATE
           SET centroid = EXCLUDED.centroid,
               centroid_lat = EXCLUDED.centroid_lat,
               centroid_lng = EXCLUDED.centroid_lng,
               aliases = EXCLUDED.aliases`,
        [e.name, e.ward, e.lga, e.lat, e.lng, e.aliases],
      );
      written++;
    }

    // Rows that are not in the file come from earlier hand-typed seeds.
    const keep = data.entries.map((e) => `${e.name}\u0000${e.ward}\u0000${e.lga}`);
    const all = await client.query<{ id: string; community_name: string; ward: string; lga: string }>(
      'SELECT id, community_name, ward, lga FROM gazetteer',
    );
    const stale = all.rows.filter((r) => !keep.includes(`${r.community_name}\u0000${r.ward}\u0000${r.lga}`));

    if (replace && stale.length > 0) {
      await client.query('DELETE FROM gazetteer WHERE id = ANY($1::uuid[])', [stale.map((r) => r.id)]);
    }
    await client.query('COMMIT');

    console.log(`Loaded ${written} places from OpenStreetMap data retrieved ${data.retrievedAt}.`);
    if (stale.length === 0) {
      console.log('The table now holds only OpenStreetMap places.');
    } else if (replace) {
      console.log(`Removed ${stale.length} rows that were not in the file.`);
    } else {
      console.log(`\n${stale.length} rows are not in the OpenStreetMap file (older hand-typed seeds). Their coordinates are unverified:`);
      for (const r of stale.slice(0, 25)) console.log(`  ${r.community_name} (${r.lga})`);
      if (stale.length > 25) console.log(`  ...and ${stale.length - 25} more`);
      console.log('\nRun again with --replace to remove them.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
