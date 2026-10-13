import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CHECKS, DumpSiteRecord, FacilityRecord, FlowRecord, ImportKind, MAX_ROWS, ReadingRecord, Row, normaliseHeader,
} from './import-rules';

const db = (p: PrismaService) => p as any;

export interface ImportRowError { row: number; message: string }
export interface ImportResult {
  kind: ImportKind;
  /** True when the rows were saved. False for a preview, or when any row had a problem. */
  committed: boolean;
  total: number;
  created: number;
  updated: number;
  /** Rows whose reference was already imported earlier. */
  skipped: number;
  errors: ImportRowError[];
}

type Good<T> = { row: number; value: T }[];

const key = (s: string) => s.trim().toLowerCase();

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  async run(kind: ImportKind, rawRows: Row[], dryRun: boolean): Promise<ImportResult> {
    if (!rawRows.length) throw new BadRequestException('The file has no rows.');
    if (rawRows.length > MAX_ROWS) {
      throw new BadRequestException(
        `A file can have at most ${MAX_ROWS} rows. This one has ${rawRows.length}. Split it and upload the parts one by one.`,
      );
    }
    const rows = rawRows.map((r) =>
      Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [normaliseHeader(k), typeof v === 'string' ? v : undefined])),
    );

    const errors: ImportRowError[] = [];
    const good: Good<any> = [];
    rows.forEach((r, i) => {
      // Row 1 of the file is the header, so the first data row is row 2.
      const checked = (CHECKS[kind] as (r: Row) => any)(r);
      if (checked.ok) good.push({ row: i + 2, value: checked.value });
      else for (const message of checked.errors) errors.push({ row: i + 2, message });
    });

    const result: ImportResult = { kind, committed: false, total: rows.length, created: 0, updated: 0, skipped: 0, errors };

    if (kind === 'dump-sites') await this.dumpSites(good, result, dryRun);
    else if (kind === 'facilities') await this.facilities(good, result, dryRun);
    else if (kind === 'waste-flows') await this.flows(good, result, dryRun);
    else await this.readings(good, result, dryRun);

    result.errors.sort((a, b) => a.row - b.row);
    return result;
  }

  /** Later copies of the same reference inside one file become errors. */
  private uniqueRefs<T extends { sourceRef: string }>(good: Good<T>, result: ImportResult): Good<T> {
    const seen = new Map<string, number>();
    return good.filter(({ row, value }) => {
      const first = seen.get(value.sourceRef);
      if (first !== undefined) {
        result.errors.push({ row, message: `reference "${value.sourceRef}" is already used on row ${first} of this file.` });
        return false;
      }
      seen.set(value.sourceRef, row);
      return true;
    });
  }

  /** A site already within this many metres of a new row counts as the same place. */
  private static readonly SAME_SITE_METRES = 150;

  private async dumpSites(good: Good<DumpSiteRecord>, result: ImportResult, dryRun: boolean) {
    const gazetteer: { communityName: string; lga: string; centroidLat: number | null; centroidLng: number | null; aliases: string[] }[] =
      await db(this.prisma).gazetteer.findMany({ select: { communityName: true, lga: true, centroidLat: true, centroidLng: true, aliases: true } });

    const plan: (DumpSiteRecord & { latitude: number; longitude: number })[] = [];
    const seen = new Set<string>();
    for (const { row, value } of good) {
      const name = key(value.communityName);
      let { latitude, longitude } = value;
      let lga = value.lga;
      if (latitude === undefined || longitude === undefined) {
        const hits = gazetteer.filter(
          (g) => g.centroidLat != null && g.centroidLng != null
            && (key(g.communityName) === name || g.aliases.some((a) => key(a) === name))
            && (!value.lga || key(g.lga) === key(value.lga)),
        );
        if (hits.length !== 1) {
          result.errors.push({
            row,
            message: hits.length
              ? `"${value.communityName}" matches ${hits.length} places. Add the lga column to say which one, or give latitude and longitude.`
              : `"${value.communityName}" is not in our list of places. Check the spelling, or give latitude and longitude.`,
          });
          continue;
        }
        latitude = hits[0].centroidLat!;
        longitude = hits[0].centroidLng!;
        lga = lga ?? hits[0].lga;
      }
      const k = `${name}|${latitude!.toFixed(3)}|${longitude!.toFixed(3)}`;
      if (seen.has(k)) {
        result.errors.push({ row, message: `"${value.communityName}" appears twice in this file.` });
        continue;
      }
      seen.add(k);
      // Great-circle distance on the stored latitude and longitude, so it needs no PostGIS function.
      const near: { id: string }[] = await this.prisma.$queryRaw`
        SELECT id FROM "dump_sites"
        WHERE status <> 'INACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL
          AND 2 * 6371000 * asin(sqrt(
                power(sin(radians(latitude - ${latitude!}::float8) / 2), 2)
                + cos(radians(${latitude!}::float8)) * cos(radians(latitude))
                  * power(sin(radians(longitude - ${longitude!}::float8) / 2), 2)
              )) < ${ImportsService.SAME_SITE_METRES}::float8
        LIMIT 1`;
      if (near.length) { result.skipped++; continue; }
      plan.push({ ...value, lga, latitude: latitude!, longitude: longitude! });
    }
    result.created = plan.length;
    if (dryRun || result.errors.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const v of plan) {
        const saved = await (tx as any).dumpSite.create({
          data: {
            communityName: v.communityName, wasteType: v.wasteType, confidenceTier: v.confidenceTier,
            status: v.confidenceTier === 'LOW' ? 'UNVERIFIED' : 'ACTIVE',
            latitude: v.latitude, longitude: v.longitude, lga: v.lga, ward: v.ward, description: v.description,
            lastConfirmedAt: v.confidenceTier === 'LOW' ? null : new Date(),
          },
        });
        await tx.$executeRaw`
          UPDATE "dump_sites" SET "location" = ST_SetSRID(ST_MakePoint(${v.longitude}, ${v.latitude}), 4326)
          WHERE id = ${saved.id}::uuid`;
      }
    }, { timeout: 60000 });
    result.committed = true;
  }

  private async facilities(good: Good<FacilityRecord>, result: ImportResult, dryRun: boolean) {
    const existing: { id: string; name: string; facilityType: string }[] =
      await db(this.prisma).facility.findMany({ select: { id: true, name: true, facilityType: true } });
    const byName = new Map(existing.map((f) => [`${key(f.name)}|${f.facilityType}`, f.id]));
    const seen = new Set<string>();
    const plan: { value: FacilityRecord; id?: string }[] = [];
    for (const { row, value } of good) {
      const k = `${key(value.name)}|${value.facilityType}`;
      if (seen.has(k)) {
        result.errors.push({ row, message: `"${value.name}" appears twice in this file.` });
        continue;
      }
      seen.add(k);
      plan.push({ value, id: byName.get(k) });
    }
    result.created = plan.filter((p) => !p.id).length;
    result.updated = plan.filter((p) => p.id).length;
    if (dryRun || result.errors.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const { value, id } of plan) {
        const saved = id
          ? await (tx as any).facility.update({ where: { id }, data: value })
          : await (tx as any).facility.create({ data: value });
        await tx.$executeRaw`
          UPDATE "facilities" SET "location" = ST_SetSRID(ST_MakePoint(${value.longitude}, ${value.latitude}), 4326)
          WHERE id = ${saved.id}::uuid`;
      }
    }, { timeout: 60000 });
    result.committed = true;
  }

  private async flows(good: Good<FlowRecord>, result: ImportResult, dryRun: boolean) {
    const rows = this.uniqueRefs(good, result);
    const already = new Set<string>(
      (await db(this.prisma).wasteFlow.findMany({
        where: { sourceRef: { in: rows.map((r) => r.value.sourceRef) } }, select: { sourceRef: true },
      })).map((f: any) => f.sourceRef),
    );
    const facilities: { id: string; name: string }[] = await db(this.prisma).facility.findMany({ select: { id: true, name: true } });
    const vehicles: { id: string; plateNumber: string }[] =
      await db(this.prisma).collectionVehicle.findMany({ select: { id: true, plateNumber: true } });
    const vehicleByPlate = new Map(vehicles.map((v) => [v.plateNumber.toUpperCase(), v.id]));

    const plan: { value: FlowRecord; facilityId?: string }[] = [];
    for (const { row, value } of rows) {
      if (already.has(value.sourceRef)) { result.skipped++; continue; }
      let facilityId: string | undefined;
      if (value.facility) {
        const hits = facilities.filter((f) => key(f.name) === key(value.facility!));
        if (hits.length !== 1) {
          result.errors.push({
            row,
            message: hits.length
              ? `facility "${value.facility}" matches ${hits.length} facilities. Make the names unique first.`
              : `facility "${value.facility}" is not registered. Import the facilities file first, or fix the spelling.`,
          });
          continue;
        }
        facilityId = hits[0].id;
      }
      plan.push({ value, facilityId });
    }
    result.created = plan.length;
    if (dryRun || result.errors.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const { value, facilityId } of plan) {
        let vehicleId: string | undefined;
        if (value.vehiclePlate) {
          vehicleId = vehicleByPlate.get(value.vehiclePlate);
          if (!vehicleId) {
            vehicleId = (await (tx as any).collectionVehicle.create({ data: { plateNumber: value.vehiclePlate } })).id as string;
            vehicleByPlate.set(value.vehiclePlate, vehicleId);
          }
        }
        const { facility: _facility, vehiclePlate: _plate, ...rest } = value;
        await (tx as any).wasteFlow.create({ data: { ...rest, destinationFacilityId: facilityId, vehicleId } });
      }
    }, { timeout: 60000 });
    result.committed = true;
  }

  private async readings(good: Good<ReadingRecord>, result: ImportResult, dryRun: boolean) {
    const rows = this.uniqueRefs(good, result);
    const already = new Set<string>(
      (await db(this.prisma).waterReading.findMany({
        where: { sourceRef: { in: rows.map((r) => r.value.sourceRef) } }, select: { sourceRef: true },
      })).map((r: any) => r.sourceRef),
    );
    const sources: { id: string; name: string; sourceRef: string | null }[] =
      await db(this.prisma).waterSource.findMany({ select: { id: true, name: true, sourceRef: true } });

    const plan: { value: ReadingRecord; sourceId: string }[] = [];
    for (const { row, value } of rows) {
      if (already.has(value.sourceRef)) { result.skipped++; continue; }
      const byRef = sources.filter((s) => s.sourceRef && key(s.sourceRef) === key(value.source));
      const hits = byRef.length ? byRef : sources.filter((s) => key(s.name) === key(value.source));
      if (hits.length !== 1) {
        result.errors.push({
          row,
          message: hits.length
            ? `source "${value.source}" matches ${hits.length} water points. Use the source_ref of the point instead of its name.`
            : `source "${value.source}" is not a registered water point. Check the spelling.`,
        });
        continue;
      }
      plan.push({ value, sourceId: hits[0].id });
    }
    result.created = plan.length;
    if (dryRun || result.errors.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const { value, sourceId } of plan) {
        const { source: _source, ...rest } = value;
        await (tx as any).waterReading.create({ data: { ...rest, sourceId } });
      }
    }, { timeout: 60000 });
    result.committed = true;
  }
}
