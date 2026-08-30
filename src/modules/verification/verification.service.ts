import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { VerificationStatus, ConfidenceTier } from '@prisma/client';
import { VerifyReportDto, isValidTransition } from './dto/verify.dto';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private sites: SitesService,
  ) {}

  async verifyReport(reportId: string, dto: VerifyReportDto, verifierId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);

    if (!isValidTransition(report.verificationStatus, dto.toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${report.verificationStatus} to ${dto.toStatus}`,
      );
    }

    // When approving to FIELD_VERIFIED, ensure a dump site record exists.
    let siteId = dto.linkedSiteId ?? report.linkedSiteId ?? undefined;
    if (dto.toStatus === VerificationStatus.FIELD_VERIFIED && !siteId) {
      if (report.geocodedLatitude && report.geocodedLongitude) {
        const site = await this.sites.create({
          latitude: report.geocodedLatitude,
          longitude: report.geocodedLongitude,
          wasteType: report.extractedWasteType ?? undefined,
          confidenceTier: ConfidenceTier.HIGH,
          communityName: report.extractedLocationText ?? undefined,
        });
        siteId = site.id;
      }
    }

    // Derive the new confidence tier for the linked site.
    const newTier = dto.toStatus === VerificationStatus.FIELD_VERIFIED
      ? ConfidenceTier.HIGH
      : dto.toStatus === VerificationStatus.CORROBORATED
        ? ConfidenceTier.MEDIUM
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.report.update({
        where: { id: reportId },
        data: {
          verificationStatus: dto.toStatus,
          ...(siteId && { linkedSiteId: siteId }),
        },
      });

      await tx.verification.create({
        data: {
          reportId,
          siteId: siteId ?? null,
          verifierId,
          fromStatus: report.verificationStatus,
          toStatus: dto.toStatus,
          notes: dto.notes,
        },
      });

      // Propagate confidence tier to the dump site.
      if (siteId && newTier) {
        await tx.dumpSite.update({
          where: { id: siteId },
          data: {
            confidenceTier: newTier,
            lastConfirmedAt: new Date(),
          },
        });
      }

      return updated;
    });
  }
}
