// Builds prisma/data/gazetteer-osm.json from OpenStreetMap, the real source for community names
// and coordinates. Run it when you want to refresh the data:
//
//   node scripts/build-gazetteer.mjs
//
// Steps
//   1. Overpass: every named place node (city, town, suburb, neighbourhood, village ...) in Rivers State.
//   2. Nominatim reverse lookup of each point, to learn its local government area (LGA).
//      Nominatim allows 1 request per second, so this takes about ten minutes for 500 places.
//      Answers are cached in scripts/.cache so an interrupted run carries on where it stopped.
//   3. Names, alternative names and coordinates are written out with their OSM ids.
//
// Data: (c) OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { overpass, sleep } from './overpass.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, '.cache');
const outFile = path.join(here, '..', 'prisma', 'data', 'gazetteer-osm.json');
fs.mkdirSync(cacheDir, { recursive: true });
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const UA = 'WasteChainMapper-gazetteer-builder/1.0 (https://github.com/impactdriverorgcollab/wastechainmapper-api)';

// The 23 LGAs of Rivers State, written the way the web app writes them.
const LGAS = [
  'Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme',
  'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio-Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika',
  'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai',
];
const squash = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const LGA_BY_KEY = new Map(LGAS.map((l) => [squash(l), l]));
// Spellings OSM uses that do not squash to the same key.
const LGA_ALIASES = {
  portharcourtcity: 'Port Harcourt', obioakpor: 'Obio-Akpor', ogbaegbemandoni: 'Ogba/Egbema/Ndoni',
  ahoadaeast: 'Ahoada East', ahoadawest: 'Ahoada West',
  emuoha: 'Emohua', // OpenStreetMap spells the area Emuoha
  ogubolo: 'Ogu/Bolo', opobonkoro: 'Opobo/Nkoro', abuaodual: 'Abua/Odual',
};

// Well-known Port Harcourt areas that OpenStreetMap maps as streets, districts or land use rather
// than as a place point. Each is looked up by name in OpenStreetMap's search. A result is kept only
// if its own name matches, so nothing is guessed.
const NAMED_AREAS = [
  'Trans Amadi', 'Rumuola', 'Mile 1', 'Mile 2', 'Mile 3', 'Mile 4', 'D-Line', 'Old GRA', 'New GRA', 'GRA Phase 2',
  'Abuloma', 'Waterlines', 'Elechi', 'Fimie', 'Eagle Island', 'Rumuibekwe', 'Rumuodara', 'Rumuodomaya', 'Agip',
  'Eleme', 'Oyigbo', 'Emohua', 'Rumuomasi', 'Rumueme', 'Rukpokwu', 'Rumuagholu', 'Ozuoba', 'Iriebe', 'Alakahia',
  'Ogbunabali', 'Borokiri', 'Diobu', 'Amadi Ama', 'Nkpolu', 'Oroworukwo', 'Woji', 'Peter Odili Road', 'Stadium Road',
  'Aba Road', 'Ikwerre Road', 'Rumuogba', 'Rumuokwurusi', 'Rivers State University', 'University of Port Harcourt',
];
const canonicalLga = (raw) => (raw ? LGA_BY_KEY.get(squash(raw)) ?? LGA_ALIASES[squash(raw)] ?? null : null);

const RANK = { city: 6, town: 5, suburb: 4, neighbourhood: 3, quarter: 3, village: 2, hamlet: 1, locality: 1, island: 1 };

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }

async function fetchPlaces() {
  const cache = path.join(cacheDir, 'places.json');
  const cached = readJson(cache, null);
  if (cached) { console.log(`places: ${cached.length} from cache`); return cached; }
  const q = '[out:json][timeout:120];area["ISO3166-2"="NG-RI"]->.ri;' +
    '(node["place"~"^(city|town|suburb|neighbourhood|quarter|village|hamlet|locality|island)$"]["name"](area.ri););out body;';
  const json = await overpass(q, { label: 'places' });
  const places = json.elements.map((e) => ({ id: e.id, lat: e.lat, lng: e.lon, tags: e.tags }));
  fs.writeFileSync(cache, JSON.stringify(places));
  console.log(`places: ${places.length} fetched from Overpass`);
  return places;
}

async function reverse(lat, lng) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': UA } },
      );
      if (res.ok) return (await res.json()).address ?? {};
      console.error(`  nominatim answered ${res.status}, waiting`);
    } catch (e) { console.error(`  nominatim error: ${e.message}`); }
    await sleep(10_000 * attempt);
  }
  return null;
}

const places = await fetchPlaces();
const revCache = path.join(cacheDir, 'reverse.json');
const rev = readJson(revCache, {});

let done = 0;
for (const p of places) {
  const key = String(p.id);
  if (!(key in rev)) {
    const address = await reverse(p.lat, p.lng);
    if (address) rev[key] = address;
    fs.writeFileSync(revCache, JSON.stringify(rev));
    await sleep(1100);
  }
  if (++done % 25 === 0) console.log(`  looked up ${done}/${places.length}`);
}

// ── Assemble ────────────────────────────────────────────────────────────────
const entries = [];
const skipped = [];
for (const p of places) {
  const t = p.tags;
  // Descriptions typed into the name field ("X by Y Hotel along Z Road") are not place names.
  // Some mappers type the real name into alt_name instead, so use that when it is short.
  const looksLikeDescription = (n) => n.trim().split(/\s+/).length > 5 || / (along|by|near|opposite|behind) /i.test(n);
  let displayName = t.name.trim();
  if (looksLikeDescription(displayName)) {
    const short = String(t.alt_name ?? '').split(';').map((v) => v.trim()).find((v) => v && !looksLikeDescription(v));
    if (!short) { skipped.push(`${t.name} (${p.id}): name reads like a description`); continue; }
    displayName = short;
  }
  const address = rev[String(p.id)] ?? {};
  let lga = canonicalLga(address.county) ?? canonicalLga(address.state_district) ?? canonicalLga(address.city_district);
  // Port Harcourt itself has no county in OSM: the city is the LGA.
  if (!lga && /port.?harcourt/i.test(`${address.city ?? ''} ${address.town ?? ''}`)) lga = 'Port Harcourt';
  // Towns such as Oyigbo and Emohua carry the same name as their LGA and have no county of their own.
  if (!lga) lga = canonicalLga(address.town) ?? canonicalLga(address.city) ?? canonicalLga(address.village);
  if (!lga) { skipped.push(`${t.name} (${p.id}): no LGA from ${JSON.stringify(address)}`); continue; }

  const aliases = new Set();
  for (const k of ['alt_name', 'old_name', 'name:en', 'short_name', 'loc_name']) {
    for (const v of String(t[k] ?? '').split(';')) { const s = v.trim(); if (s && s !== displayName && !looksLikeDescription(s)) aliases.add(s); }
  }
  entries.push({
    name: displayName,
    lga,
    ward: 'Unknown', // OSM has no ward polygons here, so the ward is not known
    lat: Number(p.lat.toFixed(6)),
    lng: Number(p.lng.toFixed(6)),
    aliases: [...aliases],
    placeType: t.place,
    osmId: `node/${p.id}`,
    ...(t.population ? { population: Number(String(t.population).replace(/\D/g, '')) || undefined } : {}),
  });
}

// ── Named areas found through OpenStreetMap search ──────────────────────────
const searchCache = path.join(cacheDir, 'search.json');
const found = readJson(searchCache, {});
const inRivers = (lat, lng) => lat >= 4.2 && lat <= 5.6 && lng >= 6.4 && lng <= 7.8;
let searched = 0;
for (const area of NAMED_AREAS) {
  if (!(area in found)) {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=en' +
      '&viewbox=6.4,5.6,7.8,4.2&bounded=1&q=' + encodeURIComponent(`${area}, Rivers State, Nigeria`);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      found[area] = res.ok ? await res.json() : [];
    } catch { found[area] = []; }
    fs.writeFileSync(searchCache, JSON.stringify(found));
    await sleep(1100);
  }
  if (++searched % 10 === 0) console.log(`  searched ${searched}/${NAMED_AREAS.length} named areas`);
}
const seenNames = new Set(entries.map((e) => `${squash(e.name)}|${e.lga}`));
let addedFromSearch = 0;
const notFound = [];
for (const area of NAMED_AREAS) {
  // Keep the first result whose own name matches what we asked for, inside Rivers State.
  const hit = (found[area] ?? []).find((r) => {
    const n = squash(r.name || r.display_name?.split(',')[0] || '');
    const want = squash(area);
    // Streets, railways and the like are not places a story would name as the location.
    const isStreet = ['highway', 'railway', 'waterway', 'natural'].includes(r.category);
    return !isStreet && inRivers(Number(r.lat), Number(r.lon)) && n && (n === want || (n.startsWith(want) && want.length >= 6));
  });
  if (!hit) { notFound.push(area); continue; }
  const a = hit.address ?? {};
  let lga = canonicalLga(a.county) ?? canonicalLga(a.state_district) ?? canonicalLga(a.city_district);
  if (!lga && /port.?harcourt/i.test(`${a.city ?? ''} ${a.town ?? ''}`)) lga = 'Port Harcourt';
  if (!lga) lga = canonicalLga(a.town) ?? canonicalLga(a.city) ?? canonicalLga(a.village);
  if (!lga) { notFound.push(`${area} (no LGA)`); continue; }
  // The match allows a longer OSM name that starts with ours, so keep the name we asked for
  // unless OSM's own name is exactly it.
  const name = squash(hit.name || '') === squash(area) ? hit.name.trim() : area;
  const key = `${squash(name)}|${lga}`;
  if (seenNames.has(key)) continue;
  seenNames.add(key);
  entries.push({
    name, lga, ward: 'Unknown',
    lat: Number(Number(hit.lat).toFixed(6)), lng: Number(Number(hit.lon).toFixed(6)),
    aliases: squash(name) === squash(area) ? [] : [area],
    placeType: hit.type === 'suburb' || hit.type === 'neighbourhood' || hit.type === 'quarter' ? hit.type : 'neighbourhood',
    osmId: `${hit.osm_type}/${hit.osm_id}`,
  });
  addedFromSearch++;
}
console.log(`added ${addedFromSearch} named areas from OpenStreetMap search; not found: ${notFound.join(', ') || 'none'}`);

// A name used in several LGAs is ambiguous. Keep the most important place of that name and drop
// the lesser ones, so "exact match" never picks an arbitrary village. Ties are all kept.
const byName = new Map();
for (const e of entries) {
  const k = squash(e.name);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(e);
}
const final = [];
let droppedDuplicates = 0;
for (const group of byName.values()) {
  const best = Math.max(...group.map((g) => RANK[g.placeType] ?? 0));
  for (const g of group) { if ((RANK[g.placeType] ?? 0) === best) final.push(g); else droppedDuplicates++; }
}
final.sort((a, b) => a.lga.localeCompare(b.lga) || a.name.localeCompare(b.name));

const out = {
  source: 'OpenStreetMap via Overpass API and Nominatim',
  license: 'ODbL 1.0. Contains information from OpenStreetMap contributors. https://www.openstreetmap.org/copyright',
  retrievedAt: new Date().toISOString().slice(0, 10),
  notes: 'Ward is "Unknown" because OpenStreetMap has no ward boundaries for these places. Coordinates are the OSM place node, usually the centre of the settlement.',
  count: final.length,
  entries: final,
};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');

const perLga = {};
for (const e of final) perLga[e.lga] = (perLga[e.lga] ?? 0) + 1;
console.log(`\nwrote ${final.length} places to ${path.relative(process.cwd(), outFile)}`);
console.log('per LGA:', JSON.stringify(perLga));
console.log(`dropped ${droppedDuplicates} lesser duplicates, skipped ${skipped.length} with no LGA`);
if (skipped.length) fs.writeFileSync(path.join(cacheDir, 'skipped.txt'), skipped.join('\n'));
