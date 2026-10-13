import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodeStatus, VerificationStatus, ReportSourceType } from '@prisma/client';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateReportDto) {
    return this.prisma.report.create({ data: dto });
  }

  findAll(filters: {
    geocodeStatus?: GeocodeStatus;
    verificationStatus?: VerificationStatus;
    sourceType?: ReportSourceType;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters;
    return this.prisma.report.findMany({
      where: {
        ...(where.geocodeStatus && { geocodeStatus: where.geocodeStatus }),
        ...(where.verificationStatus && { verificationStatus: where.verificationStatus }),
        ...(where.sourceType && { sourceType: where.sourceType }),
      },
      orderBy: { scrapedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // The reports a reviewer has to look at: everything not yet reviewed. Placed reports come first
  // (they are the ones that can go on the map straight away), then reports the scraper could not
  // place, which a reviewer can place by hand with placeReport().
  async findVerificationQueue(limit = 50) {
    const orderBy = [{ confidenceScore: 'desc' as const }, { scrapedAt: 'desc' as const }];
    const placed = await this.prisma.report.findMany({
      where: {
        geocodeStatus: { in: [GeocodeStatus.RESOLVED_GAZETTEER, GeocodeStatus.RESOLVED_NOMINATIM] },
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
      orderBy,
      take: limit,
    });
    if (placed.length >= limit) return placed;

    const unplaced = await this.prisma.report.findMany({
      where: {
        geocodeStatus: { in: [GeocodeStatus.UNRESOLVED, GeocodeStatus.PENDING] },
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
      orderBy,
      take: limit - placed.length,
    });
    return [...placed, ...unplaced];
  }

  // A reviewer picks the community a story is about. The report takes that community's position
  // and counts as matched in the gazetteer, so it can then be corroborated or field-verified.
  async placeReport(id: string, gazetteerId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    if (report.verificationStatus === VerificationStatus.FIELD_VERIFIED) {
      throw new BadRequestException('A field-verified report cannot be moved.');
    }

    const place = await this.prisma.gazetteer.findUnique({ where: { id: gazetteerId } });
    if (!place || place.centroidLat == null || place.centroidLng == null) {
      throw new BadRequestException('That place is not in the gazetteer, or it has no position.');
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        geocodedLatitude: place.centroidLat,
        geocodedLongitude: place.centroidLng,
        geocodeStatus: GeocodeStatus.RESOLVED_GAZETTEER,
        geocodeSource: 'manual_gazetteer',
        extractedLocationText: place.communityName,
      },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      // Public endpoint: show who verified (display name) but never contact details.
      include: {
        verifications: {
          select: {
            id: true, fromStatus: true, toStatus: true, notes: true, createdAt: true,
            verifier: { select: { displayName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  async update(id: string, dto: Partial<CreateReportDto>) {
    await this.findOne(id);
    return this.prisma.report.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.report.delete({ where: { id } });
  }
}
