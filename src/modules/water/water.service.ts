import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WaterSourceType, WaterAnomalyType } from '../../common/enums/deltaflow.enums';
import { CreateWaterSourceDto, CreateWaterReadingDto, CreateWaterAnomalyDto } from './dto/water.dto';

const db = (p: PrismaService) => p as any;

@Injectable()
export class WaterService {
  constructor(private prisma: PrismaService) {}

  // ── Water sources ────────────────────────────────────────────────────────────

  async createSource(dto: CreateWaterSourceDto) {
    const { latitude, longitude, ...rest } = dto;
    const src = await db(this.prisma).waterSource.create({ data: { latitude, longitude, ...rest } });
    await this.prisma.$executeRaw`
      UPDATE "water_sources"
      SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${src.id}::uuid
    `;
    return src;
  }

  findAllSources(filters: { sourceType?: WaterSourceType; lga?: string }) {
    return db(this.prisma).waterSource.findMany({
      where: {
        isActive: true,
        ...(filters.sourceType && { sourceType: filters.sourceType }),
        ...(filters.lga && { lga: filters.lga }),
      },
      include: {
        _count: { select: { readings: true, anomalies: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneSource(id: string) {
    const src = await db(this.prisma).waterSource.findUnique({
      where: { id },
      include: {
        readings: { orderBy: { recordedAt: 'desc' }, take: 20 },
        anomalies: { where: { resolvedAt: null }, orderBy: { detectedAt: 'desc' } },
      },
    });
    if (!src) throw new NotFoundException(`Water source ${id} not found`);
    return src;
  }

  // ── Water readings ───────────────────────────────────────────────────────────

  async createReading(dto: CreateWaterReadingDto) {
    const { sourceId, recordedAt, ...rest } = dto;
    await db(this.prisma).waterSource.findUniqueOrThrow({ where: { id: sourceId } });
    return db(this.prisma).waterReading.create({
      data: { sourceId, ...rest, ...(recordedAt && { recordedAt: new Date(recordedAt) }) },
    });
  }

  findReadings(sourceId: string, from?: string, to?: string) {
    return db(this.prisma).waterReading.findMany({
      where: {
        sourceId,
        ...((from || to) && {
          recordedAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  // ── Water anomalies ──────────────────────────────────────────────────────────

  async createAnomaly(dto: CreateWaterAnomalyDto) {
    const { latitude, longitude, ...rest } = dto;
    const anomaly = await db(this.prisma).waterAnomaly.create({
      data: { latitude, longitude, ...rest },
    });
    if (latitude !== undefined && longitude !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE "water_anomalies"
        SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        WHERE id = ${anomaly.id}::uuid
      `;
    }
    return anomaly;
  }

  findAnomalies(filters: { anomalyType?: WaterAnomalyType; unresolvedOnly?: boolean }) {
    return db(this.prisma).waterAnomaly.findMany({
      where: {
        ...(filters.anomalyType && { anomalyType: filters.anomalyType }),
        ...(filters.unresolvedOnly && { resolvedAt: null }),
      },
      include: { source: { select: { id: true, name: true, sourceType: true } } },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async resolveAnomaly(id: string) {
    const anomaly = await db(this.prisma).waterAnomaly.findUnique({ where: { id } });
    if (!anomaly) throw new NotFoundException(`Water anomaly ${id} not found`);
    return db(this.prisma).waterAnomaly.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────────

  async dashboardStats() {
    const [sourceCount, openAnomalies, recentReadings] = await Promise.all([
      db(this.prisma).waterSource.count({ where: { isActive: true } }),
      db(this.prisma).waterAnomaly.count({ where: { resolvedAt: null } }),
      db(this.prisma).waterReading.findMany({
        orderBy: { recordedAt: 'desc' },
        take: 10,
        include: { source: { select: { name: true, sourceType: true } } },
      }),
    ]);
    return { sourceCount, openAnomalies, recentReadings };
  }
}
