import { Injectable, NotFoundException } from '@nestjs/common';
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

  // Returns reports in the verification queue: geocoded but not yet reviewed.
  findVerificationQueue(limit = 50) {
    return this.prisma.report.findMany({
      where: {
        geocodeStatus: { in: [GeocodeStatus.RESOLVED_GAZETTEER, GeocodeStatus.RESOLVED_NOMINATIM] },
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
      orderBy: [{ confidenceScore: 'desc' }, { scrapedAt: 'desc' }],
      take: limit,
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { verifications: { include: { verifier: { select: { id: true, email: true, displayName: true } } } } },
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
