/**
 * WasteChainMapper — reference seed for Rivers State
 * Run: npx prisma db seed  (after migration + generate)
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const db = () => prisma as any;

async function main() {
  console.log('🌱 Seeding WasteChainMapper database…');

  // ── Admin user ────────────────────────────────────────────────────────────────
  const adminPw = await argon2.hash('admin-deltaflow-2026');
  await prisma.user.upsert({
    where: { email: 'admin@deltaflow.ng' },
    update: {},
    create: {
      email: 'admin@deltaflow.ng',
      passwordHash: adminPw,
      displayName: 'DeltaFlow Admin',
      role: 'ADMIN',
    },
  });
  await prisma.user.upsert({
    where: { email: 'verifier@deltaflow.ng' },
    update: {},
    create: {
      email: 'verifier@deltaflow.ng',
      passwordHash: await argon2.hash('verifier-2026'),
      displayName: 'Field Verifier',
      role: 'FIELD_VERIFIER',
    },
  });
  console.log('✓ Users seeded');

  // ── Gazetteer (Rivers State communities) ──────────────────────────────────────
  const gazetteers = [
    { community: 'Rumuola', ward: 'Rumuola', lga: 'Port Harcourt', lat: 4.8401, lng: 7.0201, aliases: ['Rumuola Road', 'Rumuola junction'] },
    { community: 'GRA Phase 2', ward: 'GRA Phase 2', lga: 'Port Harcourt', lat: 4.8156, lng: 7.0134, aliases: ['Government Residential Area', 'GRA PH'] },
    { community: 'Trans Amadi', ward: 'Trans Amadi', lga: 'Port Harcourt', lat: 4.8093, lng: 7.0299, aliases: ['Trans-Amadi', 'Trans Amadi Industrial Layout', 'Amadi Creek'] },
    { community: 'Diobu', ward: 'Diobu', lga: 'Port Harcourt', lat: 4.7831, lng: 6.9984, aliases: ['Mile 1 Diobu', 'Fimie', 'Old GRA'] },
    { community: 'Woji', ward: 'Woji', lga: 'Obio-Akpor', lat: 4.8156, lng: 7.0412, aliases: ['Woji Creek', 'Peter Odili Road'] },
    { community: 'Rumuigbo', ward: 'Rumuigbo', lga: 'Obio-Akpor', lat: 4.8234, lng: 7.0045, aliases: ['Rumuigbo', 'Elelenwo Road'] },
    { community: 'Eliozu', ward: 'Eliozu', lga: 'Obio-Akpor', lat: 4.8712, lng: 7.0564, aliases: ['Eliozu', 'Airport Road South'] },
    { community: 'Choba', ward: 'Choba', lga: 'Obio-Akpor', lat: 4.9012, lng: 7.0234, aliases: ['Choba', 'UNIPORT Road', 'University of Port Harcourt'] },
    { community: 'Elelenwo', ward: 'Elelenwo', lga: 'Obio-Akpor', lat: 4.8601, lng: 7.0401, aliases: ['Elelenwo', 'Rumuibekwe', 'Stadium Road South'] },
    { community: 'Ogale', ward: 'Ogale', lga: 'Eleme', lat: 4.7654, lng: 7.1123, aliases: ['Eleme', 'Ogale', 'Refinery Road', 'PHRC'] },
    { community: 'Okrika Town', ward: 'Okrika Town', lga: 'Okrika', lat: 4.7391, lng: 7.0892, aliases: ['Okrika', 'Waterfront Okrika'] },
    { community: 'Bonny Island', ward: 'Bonny Island', lga: 'Bonny', lat: 4.4412, lng: 7.1521, aliases: ['Bonny', 'Bonny Island', 'LNG Base'] },
    { community: 'Rumuosi', ward: 'Rumuosi', lga: 'Obio-Akpor', lat: 4.8634, lng: 7.0456, aliases: ['Rumuosi', 'Obio-Akpor junction'] },
    { community: 'Eagle Island', ward: 'Eagle Island', lga: 'Port Harcourt', lat: 4.7900, lng: 7.0050, aliases: ['Eagle Island', 'Egbelu', 'Creek side PH'] },
  ];

  for (const g of gazetteers) {
    const existing = await prisma.gazetteer.findFirst({ where: { communityName: g.community, lga: g.lga } });
    if (!existing) {
      const created = await prisma.gazetteer.create({
        data: { communityName: g.community, ward: g.ward, lga: g.lga, centroidLat: g.lat, centroidLng: g.lng, aliases: g.aliases },
      });
      await prisma.$executeRaw`
        UPDATE "gazetteer"
        SET "centroid" = ST_SetSRID(ST_MakePoint(${g.lng}, ${g.lat}), 4326)::geography
        WHERE id = ${created.id}::uuid
      `;
    }
  }
  console.log('✓ Gazetteer seeded');

  // ── Collection points ─────────────────────────────────────────────────────────
  const collectionPoints = [
    { name: 'GRA Phase 2 Waste Collection', operator: 'Rivers State MoE', ward: 'GRA Phase 2', lga: 'Port Harcourt', lat: 4.8156, lng: 7.0134, coverage: 800 },
    { name: 'Rumuola Market Waste Point', operator: 'PHED Contractors', ward: 'Rumuola', lga: 'Port Harcourt', lat: 4.8401, lng: 7.0201, coverage: 600 },
    { name: 'Trans Amadi Collection Hub', operator: 'Trans Amadi Industries Ltd', ward: 'Trans Amadi', lga: 'Port Harcourt', lat: 4.8093, lng: 7.0299, coverage: 1200 },
    { name: 'Diobu Community Waste Point', operator: 'Rivers Waste Management', ward: 'Diobu', lga: 'Port Harcourt', lat: 4.7831, lng: 6.9984, coverage: 700 },
    { name: 'Eliozu Neighbourhood Collection', operator: 'Obio-Akpor LGA', ward: 'Eliozu', lga: 'Obio-Akpor', lat: 4.8712, lng: 7.0564, coverage: 900 },
    { name: 'Rumuigbo Residential Collection', operator: 'Rivers State Env. Sanitation', ward: 'Rumuigbo', lga: 'Obio-Akpor', lat: 4.8234, lng: 7.0045, coverage: 650 },
    { name: 'Mile 3 Market Collection Point', operator: 'PHWSA', ward: 'Rumuola', lga: 'Port Harcourt', lat: 4.8001, lng: 6.9987, coverage: 500 },
    { name: 'Agip Estate Waste Hub', operator: 'Private (NLNG Partners)', ward: 'D-line', lga: 'Port Harcourt', lat: 4.8289, lng: 7.0112, coverage: 400 },
    { name: 'Woji Creek Collection Point', operator: 'Obio-Akpor LGA Sanitation', ward: 'Woji', lga: 'Obio-Akpor', lat: 4.8156, lng: 7.0412, coverage: 550 },
    { name: 'Choba University Waste Station', operator: 'UNIPORT Facilities', ward: 'Choba', lga: 'Obio-Akpor', lat: 4.9012, lng: 7.0234, coverage: 700 },
  ];

  for (const cp of collectionPoints) {
    const existing = await prisma.collectionPoint.findFirst({ where: { name: cp.name } });
    if (!existing) {
      const created = await prisma.collectionPoint.create({
        data: { name: cp.name, operator: cp.operator, ward: cp.ward, lga: cp.lga, latitude: cp.lat, longitude: cp.lng, coverageRadiusM: cp.coverage },
      });
      await prisma.$executeRaw`
        UPDATE "collection_points"
        SET "location" = ST_SetSRID(ST_MakePoint(${cp.lng}, ${cp.lat}), 4326)::geography
        WHERE id = ${created.id}::uuid
      `;
    }
  }
  console.log('✓ Collection points seeded');

  // ── Facilities ────────────────────────────────────────────────────────────────
  const facilities = [
    {
      name: 'Port Harcourt Central Recycling Plant', type: 'RECYCLING',
      operator: 'Rivers State Recycling Initiative', ward: 'Trans Amadi', lga: 'Port Harcourt',
      lat: 4.8220, lng: 7.0089, capacity: 120,
      desc: 'Primary municipal recycling plant handling plastics, paper, and organics. 3 sorting lines, baling unit.',
    },
    {
      name: 'Trans Amadi Transfer Station', type: 'TRANSFER_STATION',
      operator: 'Trans Amadi Industrial Zone Authority', ward: 'Trans Amadi', lga: 'Port Harcourt',
      lat: 4.8050, lng: 7.0310, capacity: 350,
      desc: 'Major waste transfer hub serving industrial and residential flows. Daily throughput ~280 tonnes.',
    },
    {
      name: 'Rumuola Controlled Landfill', type: 'LANDFILL',
      operator: 'Rivers State Ministry of Environment', ward: 'Rumuola', lga: 'Port Harcourt',
      lat: 4.8450, lng: 7.0321, capacity: 800,
      desc: 'State-managed controlled landfill with leachate collection system and gas venting.',
    },
    {
      name: 'Eleme Incineration Facility', type: 'INCINERATION',
      operator: 'Eleme Petrochemicals Ltd', ward: 'Ogale', lga: 'Eleme',
      lat: 4.7654, lng: 7.1123, capacity: 80,
      desc: 'High-temperature incineration for medical waste and industrial by-products. ISO 14001 certified.',
    },
    {
      name: 'Obio-Akpor Transfer Station', type: 'TRANSFER_STATION',
      operator: 'Obio-Akpor LGA', ward: 'Rumuosi', lga: 'Obio-Akpor',
      lat: 4.8634, lng: 7.0456, capacity: 200,
      desc: 'Secondary transfer station serving Obio-Akpor residential waste flows.',
    },
    {
      name: 'Choba Green Recycling Hub', type: 'RECYCLING',
      operator: 'University of Port Harcourt Ventures', ward: 'Choba', lga: 'Obio-Akpor',
      lat: 4.9012, lng: 7.0300, capacity: 45,
      desc: 'Community-scale recycling facility specialising in plastics, e-waste, and paper.',
    },
    {
      name: 'Okrika Waterfront Collection Point', type: 'COLLECTION_POINT',
      operator: 'Okrika LGA Council', ward: 'Okrika Town', lga: 'Okrika',
      lat: 4.7391, lng: 7.0892, capacity: 60,
      desc: 'Riverine waste collection point servicing island and waterfront communities.',
    },
    {
      name: 'Eagle Island Landfill (Legacy)', type: 'LANDFILL',
      operator: 'Port Harcourt LGA (Decommissioning)', ward: 'Eagle Island', lga: 'Port Harcourt',
      lat: 4.7900, lng: 7.0050, capacity: 50,
      desc: 'Legacy uncontrolled landfill — currently under RSMEPB remediation assessment.',
    },
  ];

  for (const f of facilities) {
    const existing = await db().facility.findFirst({ where: { name: f.name } });
    if (!existing) {
      const created = await db().facility.create({
        data: { name: f.name, facilityType: f.type, operator: f.operator, ward: f.ward, lga: f.lga, latitude: f.lat, longitude: f.lng, capacityTpd: f.capacity, description: f.desc },
      });
      await prisma.$executeRaw`
        UPDATE "facilities"
        SET "location" = ST_SetSRID(ST_MakePoint(${f.lng}, ${f.lat}), 4326)::geography
        WHERE id = ${created.id}::uuid
      `;
    }
  }
  console.log('✓ Facilities seeded');

  // ── Water sources ─────────────────────────────────────────────────────────────
  const waterSources = [
    {
      name: 'Rumuola Water Treatment Works', type: 'EXTRACTION',
      operator: 'PH Water Services Authority', ward: 'Rumuola', lga: 'Port Harcourt',
      lat: 4.8423, lng: 7.0298,
      desc: 'Primary surface extraction from Ntamidi River. Capacity 180,000 m³/day. Serves ~300k residents.',
    },
    {
      name: 'Trans Amadi Industrial Discharge Point', type: 'WASTEWATER',
      operator: 'Trans Amadi Industries', ward: 'Trans Amadi', lga: 'Port Harcourt',
      lat: 4.8089, lng: 7.0312,
      desc: 'Industrial effluent monitoring — outfall into Creek Road Canal. Weekly hydrocarbon sampling.',
    },
    {
      name: 'Elelenwo Water Extraction Station', type: 'EXTRACTION',
      operator: 'PHWSA', ward: 'Elelenwo', lga: 'Obio-Akpor',
      lat: 4.8601, lng: 7.0401,
      desc: 'Groundwater borehole cluster serving Elelenwo-Rumuibekwe corridor (~50k residents).',
    },
    {
      name: 'GRA Distribution Network Node', type: 'DISTRIBUTION',
      operator: 'PHWSA', ward: 'GRA Phase 1', lga: 'Port Harcourt',
      lat: 4.8200, lng: 7.0133,
      desc: 'Treated water pressure and quality monitoring for GRA Phase 1 & 2.',
    },
    {
      name: 'Bonny River Extraction Station', type: 'EXTRACTION',
      operator: 'Shell Petroleum Dev. Co.', ward: 'Bonny Island', lga: 'Bonny',
      lat: 4.4412, lng: 7.1521,
      desc: 'Tidal river extraction with salinity and hydrocarbon monitoring — Niger Delta baseline node.',
    },
    {
      name: 'Woji Creek Wastewater Monitor', type: 'WASTEWATER',
      operator: 'Rivers State Pollution Control', ward: 'Woji', lga: 'Obio-Akpor',
      lat: 4.8156, lng: 7.0412,
      desc: 'Urban runoff and wastewater monitoring — early warning for creek contamination events.',
    },
    {
      name: 'Diobu Distribution Monitoring Point', type: 'DISTRIBUTION',
      operator: 'PHWSA', ward: 'Diobu', lga: 'Port Harcourt',
      lat: 4.7850, lng: 7.0010,
      desc: 'Pressure and turbidity monitoring at Mile 1 distribution manifold.',
    },
  ];

  for (const ws of waterSources) {
    const existing = await db().waterSource.findFirst({ where: { name: ws.name } });
    if (!existing) {
      const created = await db().waterSource.create({
        data: { name: ws.name, sourceType: ws.type, operator: ws.operator, ward: ws.ward, lga: ws.lga, latitude: ws.lat, longitude: ws.lng, description: ws.desc },
      });
      await prisma.$executeRaw`
        UPDATE "water_sources"
        SET "location" = ST_SetSRID(ST_MakePoint(${ws.lng}, ${ws.lat}), 4326)::geography
        WHERE id = ${created.id}::uuid
      `;
    }
  }
  console.log('✓ Water sources seeded');

  // ── Water anomaly (sample open event) ─────────────────────────────────────────
  const anomalyExists = await db().waterAnomaly.count();
  if (anomalyExists === 0) {
    const wojiSource = await db().waterSource.findFirst({ where: { name: 'Woji Creek Wastewater Monitor' } });
    await db().waterAnomaly.create({
      data: {
        sourceId: wojiSource?.id ?? null,
        anomalyType: 'CONTAMINATION',
        latitude: 4.8156, longitude: 7.0412,
        severity: 'high',
        description: 'Elevated hydrocarbon levels detected downstream of industrial estate — likely surface runoff from trans-Amadi zone following heavy rain on 2026-08-28.',
        detectedAt: new Date('2026-08-28T09:15:00Z'),
      },
    });
    await db().waterAnomaly.create({
      data: {
        anomalyType: 'ILLEGAL_EXTRACTION',
        latitude: 4.8450, longitude: 7.0200,
        severity: 'moderate',
        description: 'Unlicensed borehole extraction reported in Rumuola — confirmed by field inspection 2026-08-30. Cease order issued.',
        detectedAt: new Date('2026-08-30T14:00:00Z'),
      },
    });
    console.log('✓ Sample water anomalies seeded');
  }

  // ── Flood zones ───────────────────────────────────────────────────────────────
  const floodZones = [
    {
      name: 'Eagle Island Flood Plain', risk: 'HIGH',
      ward: 'Eagle Island', lga: 'Port Harcourt',
      desc: 'Low-lying tidal plain. Severe flooding during seasonal rains and storm surge. 8,000 residents at annual risk.',
      source: 'NIMET 2025 Risk Assessment',
    },
    {
      name: 'Rumuola Creek Corridor', risk: 'HIGH',
      ward: 'Rumuola', lga: 'Port Harcourt',
      desc: 'Creek overflow zone. Annual flooding displaces 8,000–12,000 residents and inundates Rumuola Market.',
      source: 'NEMA Rivers State Office',
    },
    {
      name: 'Diobu-Fimie Flood Zone', risk: 'MEDIUM',
      ward: 'Diobu', lga: 'Port Harcourt',
      desc: 'Urban drainage bottleneck. Quarterly flash flooding from inadequate storm infrastructure.',
      source: 'PH LGA Infrastructure Report 2024',
    },
    {
      name: 'Trans Amadi Industrial Flood Risk', risk: 'MEDIUM',
      ward: 'Trans Amadi', lga: 'Port Harcourt',
      desc: 'Industrial zone flooding risk with potential chemical contamination of surface runoff.',
      source: 'NOSDRA Environmental Baseline 2025',
    },
    {
      name: 'Eleme Downstream Flood Buffer', risk: 'MEDIUM',
      ward: 'Ogale', lga: 'Eleme',
      desc: 'Downstream flood risk from Onne Port drainage system. Hydrocarbon spillover concern.',
      source: 'NEMA 2025',
    },
    {
      name: 'Rumuigbo Residential Zone', risk: 'LOW',
      ward: 'Rumuigbo', lga: 'Obio-Akpor',
      desc: 'Elevated terrain with functioning drainage. Minimal risk except during 100-year events.',
      source: 'Obio-Akpor LGA Survey 2025',
    },
    {
      name: 'Choba University District', risk: 'LOW',
      ward: 'Choba', lga: 'Obio-Akpor',
      desc: 'Managed drainage basin with institutional infrastructure. Low seasonal risk.',
      source: 'UNIPORT Environmental Report 2024',
    },
    {
      name: 'Woji Creek Flood Corridor', risk: 'HIGH',
      ward: 'Woji', lga: 'Obio-Akpor',
      desc: 'Urbanised creek basin with inadequate channelling. Heavy-rain flooding affects main arterial roads.',
      source: 'Rivers State Urban Development Agency 2025',
    },
  ];

  for (const fz of floodZones) {
    const existing = await db().floodZone.findFirst({ where: { name: fz.name } });
    if (!existing) {
      await db().floodZone.create({
        data: { name: fz.name, riskLevel: fz.risk, ward: fz.ward, lga: fz.lga, description: fz.desc, source: fz.source },
      });
    }
  }
  console.log('✓ Flood zones seeded');

  // ── Collection vehicles ───────────────────────────────────────────────────────
  const vehicles = [
    { plate: 'PHC-WM-001', operator: 'Rivers State Waste Management Authority', capacity: 8.0 },
    { plate: 'PHC-WM-002', operator: 'Rivers State Waste Management Authority', capacity: 10.0 },
    { plate: 'PHC-WM-003', operator: 'Rivers State Waste Management Authority', capacity: 8.0 },
    { plate: 'OA-ENV-001', operator: 'Obio-Akpor LGA Sanitation Dept', capacity: 6.0 },
    { plate: 'OA-ENV-002', operator: 'Obio-Akpor LGA Sanitation Dept', capacity: 6.0 },
    { plate: 'ELM-TC-001', operator: 'Eleme Town Council', capacity: 5.0 },
    { plate: 'IKW-LGA-001', operator: 'Ikwerre LGA Council', capacity: 7.0 },
    { plate: 'PHC-PRV-001', operator: 'Dumpsite Solutions Nig. Ltd', capacity: 12.0 },
    { plate: 'PHC-PRV-002', operator: 'Dumpsite Solutions Nig. Ltd', capacity: 12.0 },
    { plate: 'OKR-001', operator: 'Okrika Waterways Sanitation', capacity: 3.5 },
  ];

  for (const v of vehicles) {
    const existing = await db().collectionVehicle.findFirst({ where: { plateNumber: v.plate } });
    if (!existing) {
      await db().collectionVehicle.create({
        data: { plateNumber: v.plate, operator: v.operator, capacityM3: v.capacity },
      });
    }
  }
  console.log('✓ Collection vehicles seeded');

  // ── Sample waste flows ────────────────────────────────────────────────────────
  const flowCount = await db().wasteFlow.count();
  if (flowCount === 0) {
    const recyclingFacility = await db().facility.findFirst({ where: { facilityType: 'RECYCLING', lga: 'Port Harcourt' } });
    const transferStation = await db().facility.findFirst({ where: { facilityType: 'TRANSFER_STATION' } });
    const landfill = await db().facility.findFirst({ where: { facilityType: 'LANDFILL' } });

    const sampleFlows = [
      { wasteType: 'MUNICIPAL', status: 'PROCESSED', tonnage: 12.4, originLat: 4.8401, originLng: 7.0201, lga: 'Port Harcourt', ward: 'Rumuola', destId: transferStation?.id, processedAt: new Date('2026-09-01T10:00:00Z'), collectedAt: new Date('2026-09-01T06:00:00Z') },
      { wasteType: 'PLASTIC', status: 'DELIVERED', tonnage: 4.8, originLat: 4.8093, originLng: 7.0299, lga: 'Port Harcourt', ward: 'Trans Amadi', destId: recyclingFacility?.id, collectedAt: new Date('2026-09-01T07:30:00Z') },
      { wasteType: 'ORGANIC', status: 'IN_TRANSIT', tonnage: 8.1, originLat: 4.8712, originLng: 7.0564, lga: 'Obio-Akpor', ward: 'Eliozu', destId: transferStation?.id, collectedAt: new Date('2026-09-02T08:00:00Z') },
      { wasteType: 'MUNICIPAL', status: 'COLLECTED', tonnage: 6.0, originLat: 4.7831, originLng: 6.9984, lga: 'Port Harcourt', ward: 'Diobu', destId: landfill?.id, collectedAt: new Date('2026-09-02T09:15:00Z') },
      { wasteType: 'CONSTRUCTION', status: 'PENDING', tonnage: 22.0, originLat: 4.8234, originLng: 7.0045, lga: 'Obio-Akpor', ward: 'Rumuigbo', destId: landfill?.id },
      { wasteType: 'INDUSTRIAL', status: 'PROCESSED', tonnage: 9.7, originLat: 4.7654, originLng: 7.1123, lga: 'Eleme', ward: 'Ogale', destId: recyclingFacility?.id, processedAt: new Date('2026-08-31T16:00:00Z'), collectedAt: new Date('2026-08-31T10:00:00Z') },
      { wasteType: 'PLASTIC', status: 'PROCESSED', tonnage: 3.3, originLat: 4.9012, originLng: 7.0234, lga: 'Obio-Akpor', ward: 'Choba', destId: recyclingFacility?.id, processedAt: new Date('2026-08-30T14:00:00Z'), collectedAt: new Date('2026-08-30T09:00:00Z') },
      { wasteType: 'MIXED', status: 'IN_TRANSIT', tonnage: 15.6, originLat: 4.8156, originLng: 7.0134, lga: 'Port Harcourt', ward: 'GRA Phase 2', destId: landfill?.id, collectedAt: new Date('2026-09-02T11:00:00Z') },
    ];

    for (const flow of sampleFlows) {
      await db().wasteFlow.create({
        data: {
          wasteType: flow.wasteType,
          status: flow.status,
          estimatedTonnage: flow.tonnage,
          originLat: flow.originLat,
          originLng: flow.originLng,
          lga: flow.lga,
          ward: flow.ward,
          destinationFacilityId: flow.destId ?? null,
          collectedAt: flow.collectedAt ?? null,
          processedAt: flow.processedAt ?? null,
          inTransitAt: flow.status === 'IN_TRANSIT' || flow.status === 'DELIVERED' || flow.status === 'PROCESSED' ? new Date() : null,
          deliveredAt: flow.status === 'DELIVERED' || flow.status === 'PROCESSED' ? new Date() : null,
        },
      });
    }
    console.log('✓ Sample waste flows seeded');
  }

  console.log('\n✅ WasteChainMapper seed complete.');
  console.log('   Admin login: admin@deltaflow.ng / admin-deltaflow-2026');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
