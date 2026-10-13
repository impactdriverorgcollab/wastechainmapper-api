-- DEPRECATED: this script does not match the current schema (column names differ and the
-- geography columns are never filled), so it fails or produces rows spatial queries cannot see.
-- Its coordinates also disagree with prisma/seed.ts and have not been checked against a map.
-- Use prisma/seed.ts for demo data, and load real data from a checked source such as OpenStreetMap.

-- Known illegal dump sites in Rivers State (publicly documented)
INSERT INTO dump_sites (
  id, latitude, longitude, status, waste_type, confidence_tier,
  community_name, ward, lga, description,
  source_report_ids, image_urls,
  first_seen_at, created_at, updated_at
) VALUES

(gen_random_uuid(), 4.8611, 7.0132, 'ACTIVE'::"SiteStatus", 'MIXED'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Mile 3 Diobu', 'Diobu', 'Port Harcourt City',
  'Large open dump at Mile 3 market perimeter. Mixed municipal and market waste. Persistent for over a decade.',
  '{}', '{}', NOW() - INTERVAL '180 days', NOW(), NOW()),

(gen_random_uuid(), 4.8390, 7.0098, 'ACTIVE'::"SiteStatus", 'MUNICIPAL'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Diobu', 'Diobu', 'Port Harcourt City',
  'Roadside dumping along Diobu Road. Daily accumulation from surrounding residential areas.',
  '{}', '{}', NOW() - INTERVAL '90 days', NOW(), NOW()),

(gen_random_uuid(), 4.7680, 7.0398, 'ACTIVE'::"SiteStatus", 'MIXED'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Waterlines', 'Waterlines', 'Port Harcourt City',
  'Waterfront illegal dump site. Waste regularly deposited into the creek. High environmental impact.',
  '{}', '{}', NOW() - INTERVAL '365 days', NOW(), NOW()),

(gen_random_uuid(), 4.7745, 7.0480, 'ACTIVE'::"SiteStatus", 'MIXED'::"WasteType", 'MEDIUM'::"ConfidenceTier",
  'Borokiri', 'Borokiri', 'Port Harcourt City',
  'Informal dump adjacent to Borokiri waterfront community. Mixed plastics and organic waste.',
  '{}', '{}', NOW() - INTERVAL '60 days', NOW(), NOW()),

(gen_random_uuid(), 4.8499, 7.0499, 'ACTIVE'::"SiteStatus", 'INDUSTRIAL'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Trans-Amadi', 'Trans-Amadi', 'Port Harcourt City',
  'Industrial waste dump near Trans-Amadi industrial layout. Includes hazardous materials from light manufacturing.',
  '{}', '{}', NOW() - INTERVAL '120 days', NOW(), NOW()),

(gen_random_uuid(), 4.8050, 7.0610, 'ACTIVE'::"SiteStatus", 'MUNICIPAL'::"WasteType", 'MEDIUM'::"ConfidenceTier",
  'Elechi', 'Elechi', 'Port Harcourt City',
  'Open dumping ground beside Elechi market. Mainly food waste and packaging materials.',
  '{}', '{}', NOW() - INTERVAL '45 days', NOW(), NOW()),

(gen_random_uuid(), 4.8956, 7.0344, 'ACTIVE'::"SiteStatus", 'MIXED'::"WasteType", 'MEDIUM'::"ConfidenceTier",
  'Rumuokoro', 'Rumuokoro', 'Obio/Akpor',
  'Illegal dump at Rumuokoro junction. High-traffic area; waste from commuter activity.',
  '{}', '{}', NOW() - INTERVAL '30 days', NOW(), NOW()),

(gen_random_uuid(), 4.8798, 6.9987, 'ACTIVE'::"SiteStatus", 'MUNICIPAL'::"WasteType", 'LOW'::"ConfidenceTier",
  'Rukpokwu', 'Rukpokwu', 'Obio/Akpor',
  'Scattered dumping along Rukpokwu road. Increasing density as residential expansion continues.',
  '{}', '{}', NOW() - INTERVAL '14 days', NOW(), NOW()),

(gen_random_uuid(), 4.7944, 7.1211, 'ACTIVE'::"SiteStatus", 'INDUSTRIAL'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Eleme', 'Eleme Central', 'Eleme',
  'Industrial waste site near petrochemical facilities in Eleme. Suspected hazardous chemical content.',
  '{}', '{}', NOW() - INTERVAL '200 days', NOW(), NOW()),

(gen_random_uuid(), 4.7399, 7.1501, 'ACTIVE'::"SiteStatus", 'INDUSTRIAL'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Onne', 'Onne', 'Eleme',
  'Dump site adjacent to Onne Port access road. Mixed port logistics and industrial waste.',
  '{}', '{}', NOW() - INTERVAL '150 days', NOW(), NOW()),

(gen_random_uuid(), 4.6811, 7.3601, 'ACTIVE'::"SiteStatus", 'HYDROCARBON'::"WasteType", 'HIGH'::"ConfidenceTier",
  'Bori', 'Bori', 'Gokana',
  'Contaminated land in Ogoniland near Bori. Legacy oil spill and associated waste dumping. UNEP documented.',
  '{}', '{}', NOW() - INTERVAL '730 days', NOW(), NOW()),

(gen_random_uuid(), 4.8350, 7.1802, 'ACTIVE'::"SiteStatus", 'MIXED'::"WasteType", 'MEDIUM'::"ConfidenceTier",
  'Oyigbo', 'Oyigbo Central', 'Oyigbo',
  'Roadside dump along East-West Road in Oyigbo. Linked to nearby market waste.',
  '{}', '{}', NOW() - INTERVAL '75 days', NOW(), NOW());


-- Authorized waste collection/transfer points (RIWAMA-operated and designated)
INSERT INTO collection_points (
  id, name, latitude, longitude,
  operator, capacity_tonnes_day, is_active,
  lga, community_name,
  created_at, updated_at
) VALUES

(gen_random_uuid(), 'RIWAMA Mile 3 Transfer Station', 4.8620, 7.0141,
  'RIWAMA', 200, true, 'Port Harcourt City', 'Mile 3 Diobu', NOW(), NOW()),

(gen_random_uuid(), 'RIWAMA Trans-Amadi Transfer Station', 4.8511, 7.0488,
  'RIWAMA', 300, true, 'Port Harcourt City', 'Trans-Amadi', NOW(), NOW()),

(gen_random_uuid(), 'Rumuola Collection Point', 4.8710, 7.0251,
  'RIWAMA', 100, true, 'Port Harcourt City', 'Rumuola', NOW(), NOW()),

(gen_random_uuid(), 'Old GRA Refuse Collection Bay', 4.8244, 7.0361,
  'RIWAMA', 80, true, 'Port Harcourt City', 'Old GRA', NOW(), NOW()),

(gen_random_uuid(), 'Eleme Industrial Waste Depot', 4.7960, 7.1230,
  'Rivers State Ministry of Environment', 150, true, 'Eleme', 'Eleme', NOW(), NOW()),

(gen_random_uuid(), 'Rumuokoro Transfer Point', 4.8966, 7.0355,
  'RIWAMA', 120, true, 'Obio/Akpor', 'Rumuokoro', NOW(), NOW()),

(gen_random_uuid(), 'Choba Collection Bay', 4.9290, 7.0560,
  'RIWAMA', 60, true, 'Obio/Akpor', 'Choba', NOW(), NOW()),

(gen_random_uuid(), 'Okrika Community Collection Point', 4.7310, 7.0799,
  'Okrika LGA Council', 40, true, 'Okrika', 'Okrika', NOW(), NOW()),

(gen_random_uuid(), 'Oyigbo Transfer Station', 4.8360, 7.1812,
  'RIWAMA', 90, true, 'Oyigbo', 'Oyigbo', NOW(), NOW());
