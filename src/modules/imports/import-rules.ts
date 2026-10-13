// Validation for partner spreadsheets. Pure functions with no database access, so every rule can
// be tested on its own. A row either becomes a clean record or a list of plain-language problems.

export type Row = Record<string, string | undefined>;
export type Checked<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export const IMPORT_KINDS = ['dump-sites', 'facilities', 'waste-flows', 'water-readings'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export const MAX_ROWS = 1000;

// A box around the Niger Delta. It catches swapped or mistyped coordinates, not borders.
const LAT = [3.8, 7.0] as const;
const LNG = [4.5, 8.5] as const;

const FACILITY_TYPES = ['COLLECTION_POINT', 'TRANSFER_STATION', 'RECYCLING', 'LANDFILL', 'INCINERATION'];
const WASTE_TYPES = ['MUNICIPAL', 'ORGANIC', 'PLASTIC', 'INDUSTRIAL', 'MEDICAL', 'ELECTRONIC', 'CONSTRUCTION', 'MIXED', 'UNKNOWN'];
const FLOW_STATUSES = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'PROCESSED'];

const WASTE_ALIASES: Record<string, string> = {
  HOUSEHOLD: 'MUNICIPAL', DOMESTIC: 'MUNICIPAL', GENERAL: 'MUNICIPAL', FOOD: 'ORGANIC',
  PLASTICS: 'PLASTIC', EWASTE: 'ELECTRONIC', E_WASTE: 'ELECTRONIC', BUILDING: 'CONSTRUCTION',
};
const FACILITY_ALIASES: Record<string, string> = {
  DUMP: 'LANDFILL', DUMPSITE: 'LANDFILL', RECYCLING_PLANT: 'RECYCLING', RECYCLING_CENTRE: 'RECYCLING',
  INCINERATOR: 'INCINERATION', TRANSFER: 'TRANSFER_STATION',
};

/** "Transfer station", "transfer-station" and "TRANSFER_STATION" all become TRANSFER_STATION. */
const code = (v: string) => v.trim().toUpperCase().replace(/[\s\-/]+/g, '_');

export const text = (row: Row, key: string): string | undefined => {
  const v = row[key]?.trim();
  return v ? v : undefined;
};

type NumberRule = { min?: number; max?: number; label?: string };

function number(row: Row, key: string, errors: string[], required: boolean, rule: NumberRule = {}): number | undefined {
  const raw = text(row, key);
  if (raw === undefined) {
    if (required) errors.push(`${key} is required.`);
    return undefined;
  }
  // "1,250.5" is a normal way to write a number in a spreadsheet.
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    errors.push(`${key} must be a number, but it says "${raw}".`);
    return undefined;
  }
  if (rule.min !== undefined && n < rule.min) errors.push(`${key} cannot be below ${rule.min}.`);
  if (rule.max !== undefined && n > rule.max) errors.push(`${key} cannot be above ${rule.max}.`);
  return n;
}

/** 2026-03-14, 14/03/2026 (Nigerian day-first) and 14-03-2026, with an optional time. */
export function parseDate(raw: string, now = new Date()): Date | null {
  const t = raw.trim();
  let y: number, m: number, d: number, rest = '';
  let hit = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/.exec(t);
  if (hit) {
    [y, m, d] = [+hit[1], +hit[2], +hit[3]];
    rest = hit[4] ? `${hit[4].padStart(2, '0')}:${hit[5]}` : '';
  } else {
    hit = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s]+(\d{1,2}):(\d{2}))?/.exec(t);
    if (!hit) return null;
    [d, m, y] = [+hit[1], +hit[2], +hit[3]];
    rest = hit[4] ? `${hit[4].padStart(2, '0')}:${hit[5]}` : '';
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${rest || '00:00'}:00.000Z`;
  const date = new Date(iso);
  // Rejects 31 February, which JavaScript would roll into March.
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== d || date.getUTCMonth() !== m - 1) return null;
  if (y < 2000 || date.getTime() > now.getTime() + 36e5 * 24) return null;
  return date;
}

function date(row: Row, key: string, errors: string[], required: boolean): Date | undefined {
  const raw = text(row, key);
  if (raw === undefined) {
    if (required) errors.push(`${key} is required.`);
    return undefined;
  }
  const d = parseDate(raw);
  if (!d) errors.push(`${key} must be a real date from 2000 until today, like 2026-03-14 or 14/03/2026, but it says "${raw}".`);
  return d ?? undefined;
}

function choice(row: Row, key: string, errors: string[], allowed: string[], aliases: Record<string, string>, fallback?: string) {
  const raw = text(row, key);
  if (raw === undefined) {
    if (fallback === undefined) errors.push(`${key} is required. Use one of: ${allowed.join(', ')}.`);
    return fallback;
  }
  const c = code(raw);
  const value = allowed.includes(c) ? c : aliases[c];
  if (!value) errors.push(`${key} "${raw}" is not recognised. Use one of: ${allowed.join(', ')}.`);
  return value;
}

function position(row: Row, errors: string[], required: boolean, latKey = 'latitude', lngKey = 'longitude') {
  const lat = number(row, latKey, errors, required);
  const lng = number(row, lngKey, errors, required);
  if ((lat === undefined) !== (lng === undefined) && !required) errors.push(`Give both ${latKey} and ${lngKey}, or neither.`);
  if (lat !== undefined && (lat < LAT[0] || lat > LAT[1])) errors.push(`${latKey} ${lat} is outside the Niger Delta. Are latitude and longitude swapped?`);
  if (lng !== undefined && (lng < LNG[0] || lng > LNG[1])) errors.push(`${lngKey} ${lng} is outside the Niger Delta. Are latitude and longitude swapped?`);
  return { lat, lng };
}

const done = <T>(errors: string[], value: T): Checked<T> => (errors.length ? { ok: false, errors } : { ok: true, value });

// ── Facilities ──────────────────────────────────────────────────────────────────

export interface FacilityRecord {
  name: string; facilityType: string; latitude: number; longitude: number; operator?: string;
  capacityTpd?: number; lga?: string; ward?: string; description?: string;
}

export function checkFacility(row: Row): Checked<FacilityRecord> {
  const errors: string[] = [];
  const name = text(row, 'name');
  if (!name) errors.push('name is required.');
  const facilityType = choice(row, 'type', errors, FACILITY_TYPES, FACILITY_ALIASES);
  const { lat, lng } = position(row, errors, true);
  const capacityTpd = number(row, 'capacity_tpd', errors, false, { min: 0, max: 100000 });
  return done(errors, {
    name: name!, facilityType: facilityType!, latitude: lat!, longitude: lng!,
    operator: text(row, 'operator'), capacityTpd, lga: text(row, 'lga'), ward: text(row, 'ward'),
    description: text(row, 'description'),
  });
}

// ── Waste flows (tonnage records) ───────────────────────────────────────────────

export interface FlowRecord {
  sourceRef: string; wasteType: string; status: string; estimatedTonnage: number; collectedAt: Date;
  deliveredAt?: Date; processedAt?: Date; lga?: string; ward?: string; facility?: string; vehiclePlate?: string;
  originLat?: number; originLng?: number; notes?: string;
}

export function checkFlow(row: Row): Checked<FlowRecord> {
  const errors: string[] = [];
  const sourceRef = text(row, 'reference');
  if (!sourceRef) errors.push('reference is required. Use any unique ID or ticket number, so re-uploading the file is safe.');
  const wasteType = choice(row, 'waste_type', errors, WASTE_TYPES, WASTE_ALIASES);
  const status = choice(row, 'status', errors, FLOW_STATUSES, {}, 'COLLECTED');
  const estimatedTonnage = number(row, 'tonnage', errors, true, { min: 0.001, max: 100000 });
  const collectedAt = date(row, 'date', errors, true);
  const { lat, lng } = position(row, errors, false, 'origin_lat', 'origin_lng');
  const plate = text(row, 'vehicle_plate')?.toUpperCase().replace(/\s+/g, ' ');
  return done(errors, {
    sourceRef: sourceRef!, wasteType: wasteType!, status: status!, estimatedTonnage: estimatedTonnage!,
    collectedAt: collectedAt!,
    deliveredAt: status === 'DELIVERED' || status === 'PROCESSED' ? collectedAt : undefined,
    processedAt: status === 'PROCESSED' ? collectedAt : undefined,
    lga: text(row, 'lga'), ward: text(row, 'ward'), facility: text(row, 'facility'), vehiclePlate: plate,
    originLat: lat, originLng: lng, notes: text(row, 'notes'),
  });
}

// ── Water readings ──────────────────────────────────────────────────────────────

export interface ReadingRecord {
  sourceRef: string; source: string; recordedAt: Date; volumeM3?: number; ph?: number;
  turbidityNtu?: number; qualityScore?: number; isSensor: boolean; notes?: string;
}

export function checkReading(row: Row): Checked<ReadingRecord> {
  const errors: string[] = [];
  const sourceRef = text(row, 'reference');
  if (!sourceRef) errors.push('reference is required. Use any unique ID, so re-uploading the file is safe.');
  const source = text(row, 'source');
  if (!source) errors.push('source is required: the water point name or its source_ref.');
  const recordedAt = date(row, 'recorded_at', errors, true);
  const volumeM3 = number(row, 'volume_m3', errors, false, { min: 0, max: 1e9 });
  const ph = number(row, 'ph', errors, false, { min: 0, max: 14 });
  const turbidityNtu = number(row, 'turbidity_ntu', errors, false, { min: 0, max: 10000 });
  const qualityScore = number(row, 'quality_score', errors, false, { min: 0, max: 100 });
  if ([volumeM3, ph, turbidityNtu, qualityScore].every((v) => v === undefined) && !errors.some((e) => /must be a number/.test(e))) {
    errors.push('Give at least one measurement: volume_m3, ph, turbidity_ntu or quality_score.');
  }
  const sensor = text(row, 'sensor')?.toLowerCase();
  if (sensor && !['yes', 'no', 'true', 'false', 'y', 'n'].includes(sensor)) errors.push(`sensor must be yes or no, but it says "${sensor}".`);
  return done(errors, {
    sourceRef: sourceRef!, source: source!, recordedAt: recordedAt!, volumeM3, ph, turbidityNtu, qualityScore,
    isSensor: sensor === 'yes' || sensor === 'true' || sensor === 'y', notes: text(row, 'notes'),
  });
}

// ── Dump sites ──────────────────────────────────────────────────────────────────

export const SITE_CONFIDENCE = { UNCONFIRMED: 'LOW', CORROBORATED: 'MEDIUM', FIELD_VERIFIED: 'HIGH' } as const;

export interface DumpSiteRecord {
  communityName: string; wasteType: string; confidenceTier: 'LOW' | 'MEDIUM' | 'HIGH';
  latitude?: number; longitude?: number; lga?: string; ward?: string; description?: string;
}

/** Coordinates are optional: without them the service looks the community up in the gazetteer. */
export function checkDumpSite(row: Row): Checked<DumpSiteRecord> {
  const errors: string[] = [];
  const communityName = text(row, 'community');
  if (!communityName) errors.push('community is required: the name of the community or place.');
  const wasteType = choice(row, 'waste_type', errors, WASTE_TYPES, WASTE_ALIASES, 'UNKNOWN');
  const { lat, lng } = position(row, errors, false);
  const level = choice(row, 'confidence', errors, Object.keys(SITE_CONFIDENCE), { UNVERIFIED: 'UNCONFIRMED', CHECKED: 'CORROBORATED', VERIFIED: 'FIELD_VERIFIED' }, 'UNCONFIRMED');
  return done(errors, {
    communityName: communityName!, wasteType: wasteType!,
    confidenceTier: SITE_CONFIDENCE[level as keyof typeof SITE_CONFIDENCE],
    latitude: lat, longitude: lng, lga: text(row, 'lga'), ward: text(row, 'ward'), description: text(row, 'description'),
  });
}

export const CHECKS = { 'dump-sites': checkDumpSite, facilities: checkFacility, 'waste-flows': checkFlow, 'water-readings': checkReading } as const;

/** Header names a person might type, mapped to the names above. */
export const normaliseHeader = (h: string) =>
  h.replace(/^﻿/, '').trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[()]/g, '');
