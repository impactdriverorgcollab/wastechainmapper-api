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
    if (dto.linkedSiteId) {
      const linked = await this.prisma.dumpSite.findUnique({ where: { id: dto.linkedSiteId }, select: { id: true } });
      if (!linked) throw new BadRequestException(`Site ${dto.linkedSiteId} not found`);
    }

    // Tier follows the evidence: desk-corroborated is MEDIUM, field-verified is HIGH.
    const newTier = dto.toStatus === VerificationStatus.FIELD_VERIFIED
      ? ConfidenceTier.HIGH
      : dto.toStatus === VerificationStatus.CORROBORATED
        ? ConfidenceTier.MEDIUM
        : undefined;

    const hasCoords = report.geocodedLatitude != null && report.geocodedLongitude != null;

    return this.prisma.$transaction(async (tx) => {
      // A corroborated or field-verified report with a location becomes a dump site, so it
      // reaches the public map. Rejected reports never create one.
      let siteId = existingSiteId;
      if (newTier && !siteId && hasCoords) {
        // Fill ward and LGA from the gazetteer when the community name is known.
        const place = report.extractedLocationText
          ? await tx.$queryRaw<{ ward: string; lga: string }[]>`
              SELECT ward, lga FROM gazetteer
              WHERE LOWER(community_name) = LOWER(${report.extractedLocationText})
              LIMIT 1`
          : [];

        const rows = await tx.$queryRaw<[{ id: string }]>`
          INSERT INTO dump_sites (
            location, latitude, longitude,
            status, waste_type, confidence_tier,
            community_name, ward, lga, source_report_ids, image_urls,
            first_seen_at, created_at, updated_at
          ) VALUES (
            ST_MakePoint(${report.geocodedLongitude}, ${report.geocodedLatitude})::geography,
            ${report.geocodedLatitude}, ${report.geocodedLongitude},
            ${SiteStatus.UNVERIFIED}::"SiteStatus",
            ${(report.extractedWasteType ?? WasteType.UNKNOWN)}::"WasteType",
            ${newTier}::"ConfidenceTier",
            ${report.extractedLocationText ?? null},
            ${place[0]?.ward ?? null}, ${place[0]?.lga ?? null},
            ARRAY[${report.id}::uuid], '{}',
            COALESCE(${report.publishedAt}::timestamptz, NOW()), NOW(), NOW()
          )
          RETURNING id
        `;
        siteId = rows[0].id;
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

      // Never downgrade a site. A second report corroborating a field-verified site keeps HIGH.
      if (siteId && newTier) {
        const site = await tx.dumpSite.findUnique({
          where: { id: siteId },
          select: { confidenceTier: true, status: true, sourceReportIds: true },
        });
        const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
        const keepTier = site && rank[site.confidenceTier] > rank[newTier];
        await tx.dumpSite.update({
          where: { id: siteId },
          data: {
            ...(!keepTier && { confidenceTier: newTier }),
            // Field-verified means the site is real and active. A site that had been hidden after a
            // rejection comes back when a reviewer later reopens and confirms its report.
            ...(site?.status === SiteStatus.INACTIVE && {
              status: dto.toStatus === VerificationStatus.FIELD_VERIFIED ? SiteStatus.ACTIVE : SiteStatus.UNVERIFIED,
            }),
            ...(dto.toStatus === VerificationStatus.FIELD_VERIFIED && site?.status === SiteStatus.UNVERIFIED && {
              status: SiteStatus.ACTIVE,
            }),
            ...(site && !site.sourceReportIds.includes(reportId) && {
              sourceReportIds: [...site.sourceReportIds, reportId],
            }),
            lastConfirmedAt: new Date(),
          },
        });
      }

      // The scraper puts a located story on the map as an unconfirmed site. If a reviewer rejects
      // its only report, the site has no support left, so it is hidden. A site that anyone has
      // corroborated or verified is never hidden by one rejection, and a site that another,
      // still-standing report backs stays.
      if (dto.toStatus === VerificationStatus.REJECTED && siteId) {
        const site = await tx.dumpSite.findUnique({
          where: { id: siteId },
          select: { confidenceTier: true, status: true, sourceReportIds: true },
        });
        if (site && site.confidenceTier === ConfidenceTier.LOW && site.status === SiteStatus.UNVERIFIED) {
          const standing = await tx.report.count({
            where: {
              id: { in: site.sourceReportIds.filter((id) => id !== reportId) },
              verificationStatus: { not: VerificationStatus.REJECTED },
            },
          });
          if (standing === 0) {
            await tx.dumpSite.update({ where: { id: siteId }, data: { status: SiteStatus.INACTIVE } });
          }
        }
      }

      return updated;
    });
  }
}
