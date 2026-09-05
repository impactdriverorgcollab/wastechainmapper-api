import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGazetteerDto {
  @ApiProperty() @IsString() communityName: string;
  @ApiProperty() @IsString() ward: string;
  @ApiProperty() @IsString() lga: string;
  @ApiProperty() @IsNumber() centroidLat: number;
  @ApiProperty() @IsNumber() centroidLng: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() aliases?: string[];
}

@Injectable()
export class GazetteerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGazetteerDto) {
    const rows = await this.prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO gazetteer (
        community_name, ward, lga,
        centroid, centroid_lat, centroid_lng,
        aliases, created_at, updated_at
      ) VALUES (
        ${dto.communityName}, ${dto.ward}, ${dto.lga},
        ST_MakePoint(${dto.centroidLng}, ${dto.centroidLat})::geography,
        ${dto.centroidLat}, ${dto.centroidLng},
        ${dto.aliases ?? []}::text[],
        NOW(), NOW()
      )
      ON CONFLICT (community_name, ward, lga) DO UPDATE
        SET centroid = EXCLUDED.centroid,
            centroid_lat = EXCLUDED.centroid_lat,
            centroid_lng = EXCLUDED.centroid_lng,
            aliases = EXCLUDED.aliases,
            updated_at = NOW()
      RETURNING id
    `;
    return this.prisma.gazetteer.findUniqueOrThrow({ where: { id: rows[0].id } });
  }

  findAll(lga?: string) {
    return this.prisma.gazetteer.findMany({
      where: lga ? { lga } : undefined,
      orderBy: [{ lga: 'asc' }, { ward: 'asc' }, { communityName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.gazetteer.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Gazetteer entry ${id} not found`);
    return entry;
  }

  async update(id: string, dto: Partial<CreateGazetteerDto>) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.centroidLat !== undefined && dto.centroidLng !== undefined) {
        await tx.$executeRaw`
          UPDATE gazetteer
          SET centroid = ST_MakePoint(${dto.centroidLng}, ${dto.centroidLat})::geography,
              centroid_lat = ${dto.centroidLat},
              centroid_lng = ${dto.centroidLng}
          WHERE id = ${id}::uuid
        `;
      }
      return tx.gazetteer.update({
        where: { id },
        data: {
          ...(dto.communityName && { communityName: dto.communityName }),
          ...(dto.ward && { ward: dto.ward }),
          ...(dto.lga && { lga: dto.lga }),
          ...(dto.aliases && { aliases: dto.aliases }),
        },
      });
    });
  }

  // Fuzzy lookup by name — used by the scraper's geocoding pipeline.
  // Returns the closest match above a similarity threshold.
  async fuzzyLookup(name: string, lga?: string): Promise<{ id: string; centroidLat: number; centroidLng: number; communityName: string; ward: string; lga: string } | null> {
    const rows = await this.prisma.$queryRaw<{ id: string; centroid_lat: number; centroid_lng: number; community_name: string; ward: string; lga: string; sim: number }[]>`
      SELECT id, centroid_lat, centroid_lng, community_name, ward, lga,
             GREATEST(
               similarity(LOWER(community_name), LOWER(${name})),
               similarity(LOWER(array_to_string(aliases, ' ')), LOWER(${name}))
             ) AS sim
      FROM gazetteer
      WHERE centroid IS NOT NULL
        ${lga ? Prisma.sql`AND LOWER(lga) = LOWER(${lga})` : Prisma.empty}
      ORDER BY sim DESC
      LIMIT 1
    `;

    if (!rows.length || rows[0].sim < 0.4) return null;
    const r = rows[0];
    return { id: r.id, centroidLat: r.centroid_lat, centroidLng: r.centroid_lng, communityName: r.community_name, ward: r.ward, lga: r.lga };
  }
}
