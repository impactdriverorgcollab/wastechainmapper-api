// Run with: npm run test:imports
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { checkDumpSite, checkFacility, checkFlow, checkReading, parseDate, normaliseHeader } from './import-rules';

const bad = (r: ReturnType<typeof checkFlow>) => (r.ok ? [] : r.errors);

test('dates: ISO, day-first and impossible dates', () => {
  assert.equal(parseDate('2026-03-14')?.toISOString(), '2026-03-14T00:00:00.000Z');
  assert.equal(parseDate('14/03/2026')?.toISOString(), '2026-03-14T00:00:00.000Z');
  assert.equal(parseDate('14-03-2026 08:30')?.toISOString(), '2026-03-14T08:30:00.000Z');
  assert.equal(parseDate('2026-02-31'), null, '31 February must not roll into March');
  assert.equal(parseDate('2026-13-01'), null);
  assert.equal(parseDate('1999-01-01'), null);
  assert.equal(parseDate('2999-01-01'), null, 'future dates are mistakes');
  assert.equal(parseDate('yesterday'), null);
});

test('headers are forgiving about case, spaces and the Excel byte order mark', () => {
  assert.equal(normaliseHeader('﻿Waste Type'), 'waste_type');
  assert.equal(normaliseHeader(' Capacity-TPD '), 'capacity_tpd');
});

test('facility: friendly type names and a complete row', () => {
  const r = checkFacility({ name: ' Eleme Transfer ', type: 'transfer station', latitude: '4.79', longitude: '7.12', capacity_tpd: '1,250' });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.name, 'Eleme Transfer');
    assert.equal(r.value.facilityType, 'TRANSFER_STATION');
    assert.equal(r.value.capacityTpd, 1250);
  }
  const dump = checkFacility({ name: 'x', type: 'Dumpsite', latitude: '4.79', longitude: '7.12' });
  assert.ok(dump.ok && dump.value.facilityType === 'LANDFILL');
});

test('facility: swapped coordinates, unknown type and missing name are all reported together', () => {
  const r = checkFacility({ name: '', type: 'zoo', latitude: '7.12', longitude: '4.79', capacity_tpd: '-3' });
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.equal(r.errors.length, 4, r.errors.join(' | '));
    assert.ok(r.errors.some((e) => /swapped/.test(e)));
    assert.ok(r.errors.some((e) => /not recognised/.test(e)));
  }
});

test('flow: needs a reference, a tonnage above zero and a real date', () => {
  const ok = { reference: 'T-1', waste_type: 'household', tonnage: '12.5', date: '03/02/2026' };
  const r = checkFlow(ok);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.wasteType, 'MUNICIPAL');
    assert.equal(r.value.status, 'COLLECTED');
    assert.equal(r.value.collectedAt.toISOString(), '2026-02-03T00:00:00.000Z', 'day first: 3 February');
    assert.equal(r.value.deliveredAt, undefined);
  }
  assert.ok(bad(checkFlow({ ...ok, reference: '' })).some((e) => /reference/.test(e)));
  assert.ok(bad(checkFlow({ ...ok, tonnage: '0' })).some((e) => /below/.test(e)));
  assert.ok(bad(checkFlow({ ...ok, tonnage: 'twelve' })).some((e) => /must be a number/.test(e)));
  assert.ok(bad(checkFlow({ ...ok, date: '31/02/2026' })).some((e) => /real date/.test(e)));
  assert.ok(bad(checkFlow({ ...ok, waste_type: 'gold' })).some((e) => /not recognised/.test(e)));
});

test('flow: delivered and processed rows fill the matching timestamps', () => {
  const base = { reference: 'T-2', waste_type: 'plastic', tonnage: '3', date: '2026-02-03' };
  const delivered = checkFlow({ ...base, status: 'delivered' });
  assert.ok(delivered.ok && delivered.value.deliveredAt && !delivered.value.processedAt);
  const processed = checkFlow({ ...base, status: 'Processed' });
  assert.ok(processed.ok && processed.value.deliveredAt && processed.value.processedAt);
});

test('flow: origin coordinates must come as a pair', () => {
  const base = { reference: 'T-3', waste_type: 'plastic', tonnage: '3', date: '2026-02-03' };
  assert.ok(bad(checkFlow({ ...base, origin_lat: '4.8' })).some((e) => /both/.test(e)));
  assert.ok(checkFlow({ ...base, origin_lat: '4.8', origin_lng: '7.0' }).ok);
});

test('reading: needs at least one measurement and sensible ranges', () => {
  const base = { reference: 'R-1', source: 'Borehole, Khana', recorded_at: '2026-03-01' };
  const none = checkReading(base);
  assert.ok(!none.ok && none.errors.some((e) => /at least one measurement/.test(e)));
  assert.ok(checkReading({ ...base, ph: '7.2' }).ok);
  const wild = checkReading({ ...base, ph: '17', quality_score: '140', sensor: 'maybe' });
  assert.ok(!wild.ok && wild.errors.length === 3, wild.ok ? '' : wild.errors.join(' | '));
  const sensor = checkReading({ ...base, volume_m3: '40', sensor: 'Yes' });
  assert.ok(sensor.ok && sensor.value.isSensor);
});

test('a text value in a number column gives one clear message, not a second one about missing measurements', () => {
  const r = checkReading({ reference: 'R-2', source: 's', recorded_at: '2026-03-01', ph: 'seven' });
  assert.ok(!r.ok && r.errors.length === 1 && /must be a number/.test(r.errors[0]));
});

test('dump site: only the community is needed, confidence defaults to unconfirmed', () => {
  const r = checkDumpSite({ community: ' Iwofe ' });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.communityName, 'Iwofe');
    assert.equal(r.value.confidenceTier, 'LOW');
    assert.equal(r.value.wasteType, 'UNKNOWN');
    assert.equal(r.value.latitude, undefined);
  }
});

test('dump site: confidence words, coordinates as a pair, and the Niger Delta box', () => {
  const ok = checkDumpSite({ community: 'x', confidence: 'field verified', latitude: '4.8', longitude: '7.0', waste_type: 'plastic' });
  assert.ok(ok.ok && ok.value.confidenceTier === 'HIGH' && ok.value.wasteType === 'PLASTIC');
  const half = checkDumpSite({ community: 'x', latitude: '4.8' });
  assert.ok(!half.ok && half.errors.some((e) => /both/.test(e)));
  const far = checkDumpSite({ community: 'x', latitude: '9.0', longitude: '7.0' });
  assert.ok(!far.ok && far.errors.some((e) => /outside the Niger Delta/.test(e)));
  const bad = checkDumpSite({ community: 'x', confidence: 'sure' });
  assert.ok(!bad.ok && bad.errors.some((e) => /not recognised/.test(e)));
  assert.ok(!checkDumpSite({ community: '' }).ok);
});
