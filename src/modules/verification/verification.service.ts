import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { VerificationStatus, ConfidenceTier, SiteStatus, WasteType } from '@prisma/client';
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

    const existingSiteId = dto.linkedSiteId ?? report.linkedSiteId ?? undefined;

    // Derive the new confidence tier for the linked site.
    const newTier = dto.toStatus === VerificationStatus.FIELD_VERIFIED
      ? ConfidenceTier.HIGH
      : dto.toStatus === VerificationStatus.CORROBORATED
        ? ConfidenceTier.MEDIUM
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      // Create a dump site inside the transaction if FIELD_VERIFIED and no site exists yet.
      let siteId = existingSiteId;
      if (dto.toStatus === VerificationStatus.FIELD_VERIFIED && !siteId) {
        if (report.geocodedLatitude && report.geocodedLongitude) {
          const rows = await tx.$queryRaw<[{ id: string }]>`
            INSERT INTO dump_sites (
              location, latitude, longitude,
              status, waste_type, confidence_tier,
              community_name, source_report_ids, image_urls,
              first_seen_at, created_at, updated_at
            ) VALUES (
              ST_MakePoint(${report.geocodedLongitude}, ${report.geocodedLatitude})::geography,
              ${report.geocodedLatitude}, ${report.geocodedLongitude},
              ${SiteStatus.UNVERIFIED}::"SiteStatus",
              ${(report.extractedWasteType ?? WasteType.UNKNOWN)}::"WasteType",
              ${ConfidenceTier.HIGH}::"ConfidenceTier",
              ${report.extractedLocationText ?? null},
              '{}', '{}',
              NOW(), NOW(), NOW()
            )
            RETURNING id
          `;
          siteId = rows[0].id;
        }
      }

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
