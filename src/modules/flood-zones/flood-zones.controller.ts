import { Controller, Get, Post, Body, Query, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FloodRiskLevel } from '../../common/enums/deltaflow.enums';
import { IsEnum, IsOptional, IsString, IsJSON } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const db = (p: PrismaService) => p as any;

class FloodZoneFilterDto {
  @ApiPropertyOptional({ enum: FloodRiskLevel }) @IsOptional() @IsEnum(FloodRiskLevel) riskLevel?: FloodRiskLevel;
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
}

class CreateFloodZoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiProperty({ enum: FloodRiskLevel }) @IsEnum(FloodRiskLevel) riskLevel: FloodRiskLevel;
  @ApiPropertyOptional() @IsOptional() @IsString() ward?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional({ description: 'Polygon geometry as a GeoJSON string' })
  @IsOptional() @IsJSON() boundaryGeoJson?: string;
}

@ApiTags('flood-zones')
@Controller('flood-zones')
export class FloodZonesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List flood-risk zones for map overlay' })
  findAll(@Query() q: FloodZoneFilterDto) {
    return db(this.prisma).floodZone.findMany({
      where: {
        ...(q.riskLevel && { riskLevel: q.riskLevel }),
        ...(q.lga && { lga: q.lga }),
      },
      select: {
        id: true, name: true, riskLevel: true,
        ward: true, lga: true, description: true, source: true, createdAt: true,
      },
      orderBy: { riskLevel: 'asc' },
    });
  }

  @Get(':id/geojson')
  @ApiOperation({ summary: 'Return the boundary of a flood zone as a GeoJSON Feature' })
  async getGeoJson(@Param('id') id: string) {
    const rows = await this.prisma.$queryRaw<{ geojson: string }[]>`
      SELECT ST_AsGeoJSON(boundary)::text AS geojson
      FROM "flood_zones"
      WHERE id = ${id}::uuid
    `;
    if (!rows.length) throw new NotFoundException('Flood zone not found');
    const zone = await db(this.prisma).floodZone.findUnique({
      where: { id },
      select: { id: true, name: true, riskLevel: true, lga: true, ward: true, description: true },
    });
    if (!zone) throw new NotFoundException('Flood zone not found');
    return {
      type: 'Feature',
      properties: { id: zone.id, name: zone.name, riskLevel: zone.riskLevel, lga: zone.lga, ward: zone.ward, description: zone.description },
      geometry: rows[0].geojson ? JSON.parse(rows[0].geojson) : null,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a flood-risk zone (boundary loaded separately via raw SQL/GIS tool)' })
  async create(@Body() dto: CreateFloodZoneDto) {
    const { boundaryGeoJson, ...rest } = dto;
    const zone = await db(this.prisma).floodZone.create({ data: rest });
    if (boundaryGeoJson) {
      await this.prisma.$executeRaw`
        UPDATE "flood_zones"
        SET "boundary" = ST_GeomFromGeoJSON(${boundaryGeoJson})::geography
        WHERE id = ${zone.id}::uuid
      `;
    }
    return zone;
  }
}
