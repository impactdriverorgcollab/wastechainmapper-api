import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SiteStatus, WasteType, ConfidenceTier } from '@prisma/client';
import { CreateSiteDto } from './dto/create-site.dto';
import { RadiusQueryDto, WardQueryDto } from './dto/radius-query.dto';

export interface RawSiteRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  status: SiteStatus;
  waste_type: WasteType;
  confidence_tier: ConfidenceTier;
  community_name: string | null;
  ward: string | null;
  lga: string | null;
  description: string | null;
  first_seen_at: Date;
  last_confirmed_at: Date | null;
  distance_m?: number;
}

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────────────────────────
  // We use $queryRaw for the insert so we can populate the geography(Point) column
  // via ST_MakePoint. The denormalized latitude/longitude columns are set alongside it.
  async create(dto: CreateSiteDto) {
    const rows = await this.prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO dump_sites (
        location, latitude, longitude,
        status, waste_type, confidence_tier,
        community_name, ward, lga, description,
        source_report_ids, image_urls,
        first_seen_at, created_at, updated_at
      ) VALUES (
        ST_MakePoint(${dto.longitude}, ${dto.latitude})::geography,
        ${dto.latitude},
        ${dto.longitude},
        ${(dto.status ?? SiteStatus.UNVERIFIED)}::"SiteStatus",
        ${(dto.wasteType ?? WasteType.UNKNOWN)}::"WasteType",
        ${(dto.confidenceTier ?? ConfidenceTier.LOW)}::"ConfidenceTier",
        ${dto.communityName ?? null},
        ${dto.ward ?? null},
        ${dto.lga ?? null},
        ${dto.description ?? null},
        '{}', '{}',
        NOW(), NOW(), NOW()
      )
      RETURNING id
    `;
    return this.prisma.dumpSite.findUniqueOrThrow({ where: { id: rows[0].id } });
  }

  // ── List (Prisma — no geography column needed) ───────────────────────────
  findAll(filters: {
    lga?: string;
    ward?: string;
    confidenceTier?: ConfidenceTier;
    wasteType?: WasteType;
    status?: SiteStatus;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters;
    return this.prisma.dumpSite.findMany({
      where: {
        ...(where.lga && { lga: where.lga }),
        ...(where.ward && { ward: where.ward }),
        ...(where.confidenceTier && { confidenceTier: where.confidenceTier }),
        ...(where.wasteType && { wasteType: where.wasteType }),
        // INACTIVE sites (for example an unconfirmed site whose every report was rejected) are
        // hidden unless someone asks for that status by name.
        status: where.status ?? { not: SiteStatus.INACTIVE },
      },
      orderBy: { firstSeenAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.dumpSite.findUnique({
      where: { id },
      include: { reports: { select: { id: true, sourceUrl: true, sourceType: true, scrapedAt: true } } },
    });
    if (!site) throw new NotFoundException(`Site ${id} not found`);
    return site;
  }

  // ── Spatial: radius search ────────────────────────────────────────────────
  // ST_DWithin on geography columns measures distance in metres on the Earth surface.
  // ST_Distance returns the distance so we can include it in results for sorting.
  async findWithinRadius(dto: RadiusQueryDto): Promise<(RawSiteRow & { distance_m: number })[]> {
    const rows = await this.prisma.$queryRaw<(RawSiteRow & { distance_m: number })[]>`
      SELECT
        id, latitude, longitude, status, waste_type, confidence_tier,
        community_name, ward, lga, description, first_seen_at, last_confirmed_at,
        ROUND(
          ST_Distance(location, ST_MakePoint(${dto.lng}, ${dto.lat})::geography)::numeric,
          1
        )::float AS distance_m
      FROM dump_sites
      WHERE
        location IS NOT NULL
        AND status <> 'INACTIVE'::"SiteStatus"
        AND ST_DWithin(location, ST_MakePoint(${dto.lng}, ${dto.lat})::geography, ${dto.radiusM})
        ${dto.confidenceTier ? Prisma.sql`AND confidence_tier = ${dto.confidenceTier}::"ConfidenceTier"` : Prisma.empty}
        ${dto.wasteType ? Prisma.sql`AND waste_type = ${dto.wasteType}::"WasteType"` : Prisma.empty}
      ORDER BY distance_m ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      status: r.status,
      wasteType: r.waste_type,
      confidenceTier: r.confidence_tier,
      communityName: r.community_name,
      ward: r.ward,
      lga: r.lga,
      description: r.description,
      firstSeenAt: r.first_seen_at,
      lastConfirmedAt: r.last_confirmed_at,
      distance_m: r.distance_m,
    })) as any;
  }

  // ── Spatial: ward/LGA containment ────────────────────────────────────────
  // Requires the gazetteer boundary polygon to be populated for the given ward.
  async findWithinWard(dto: WardQueryDto): Promise<RawSiteRow[]> {
    const rows = await this.prisma.$queryRaw<RawSiteRow[]>`
      SELECT ds.id, ds.latitude, ds.longitude, ds.status, ds.waste_type,
             ds.confidence_tier, ds.community_name, ds.ward, ds.lga,
             ds.description, ds.first_seen_at, ds.last_confirmed_at
      FROM dump_sites ds
      JOIN gazetteer g
        ON LOWER(g.ward) = LOWER(${dto.ward})
        AND LOWER(g.lga) = LOWER(${dto.lga})
        AND g.boundary IS NOT NULL
      WHERE
        ds.location IS NOT NULL
        AND ds.status <> 'INACTIVE'::"SiteStatus"
        AND ST_Within(ds.location::geometry, g.boundary::geometry)
      ORDER BY ds.first_seen_at DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      status: r.status,
      wasteType: r.waste_type,
      confidenceTier: r.confidence_tier,
      communityName: r.community_name,
      ward: r.ward,
      lga: r.lga,
      description: r.description,
      firstSeenAt: r.first_seen_at,
      lastConfirmedAt: r.last_confirmed_at,
    })) as any;
  }

  // ── Update ───────────────────────────────────────────────────────────────
  async update(id: string, dto: Partial<CreateSiteDto>) {
    await this.findOne(id);

    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException('Send latitude and longitude together.');
    }

    // If coordinates are being updated, rebuild the geography column via raw SQL.
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE dump_sites
        SET
          location  = ST_MakePoint(${dto.longitude}, ${dto.latitude})::geography,
          latitude  = ${dto.latitude},
          longitude = ${dto.longitude},
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
    }

    // Update non-spatial fields via Prisma.
    const { latitude: _lat, longitude: _lng, ...rest } = dto;
    if (Object.keys(rest).length > 0) {
      return this.prisma.dumpSite.update({
        where: { id },
        data: {
          ...(rest.status && { status: rest.status }),
          ...(rest.wasteType && { wasteType: rest.wasteType }),
          ...(rest.confidenceTier && { confidenceTier: rest.confidenceTier }),
          ...(rest.communityName !== undefined && { communityName: rest.communityName }),
          ...(rest.ward !== undefined && { ward: rest.ward }),
          ...(rest.lga !== undefined && { lga: rest.lga }),
          ...(rest.description !== undefined && { description: rest.description }),
          ...(rest.sourceReportIds && { sourceReportIds: rest.sourceReportIds }),
        },
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.dumpSite.delete({ where: { id } });
  }
}
