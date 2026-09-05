import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const db = (p: PrismaService) => p as any;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Heatmap: site locations weighted by confidence tier for density visualization
  async heatmapData(lga?: string) {
    const sites = await this.prisma.dumpSite.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        ...(lga && { lga }),
      },
      select: { latitude: true, longitude: true, confidenceTier: true, wasteType: true },
    });

    return sites.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
      weight: s.confidenceTier === 'HIGH' ? 1.0 : s.confidenceTier === 'MEDIUM' ? 0.6 : 0.3,
      wasteType: s.wasteType,
    }));
  }

  // Waste flow timeline: flows by date and status for playback
  async flowTimeline(lga?: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return db(this.prisma).wasteFlow.findMany({
      where: {
        createdAt: { gte: since },
        ...(lga && { lga }),
        originLat: { not: null },
        originLng: { not: null },
      },
      select: {
        id: true,
        wasteType: true,
        status: true,
        estimatedTonnage: true,
        originLat: true,
        originLng: true,
        lga: true,
        createdAt: true,
        collectedAt: true,
        deliveredAt: true,
        processedAt: true,
        destinationFacility: { select: { latitude: true, longitude: true, name: true, facilityType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Contractor/LGA benchmarking: compare flow completion rates
  async benchmarkByLga() {
    const flows = await db(this.prisma).wasteFlow.groupBy({
      by: ['lga', 'status'],
      _count: { id: true },
      _sum: { estimatedTonnage: true },
    });

    const byLga: Record<string, { lga: string; total: number; processed: number; tonnage: number; rate: number }> = {};
    for (const row of flows) {
      const lga = row.lga ?? 'Unknown';
      if (!byLga[lga]) byLga[lga] = { lga, total: 0, processed: 0, tonnage: 0, rate: 0 };
      byLga[lga].total += row._count.id;
      byLga[lga].tonnage += row._sum.estimatedTonnage ?? 0;
      if (row.status === 'PROCESSED') byLga[lga].processed += row._count.id;
    }
    for (const row of Object.values(byLga)) {
      row.rate = row.total > 0 ? +(row.processed / row.total).toFixed(3) : 0;
    }
    return Object.values(byLga).sort((a, b) => b.rate - a.rate);
  }

  // Platform-wide summary stats
  async platformSummary() {
    const [
      totalSites, totalFlows, processedFlows, openAnomalies,
      facilities, waterSources, vehicles,
    ] = await Promise.all([
      this.prisma.dumpSite.count(),
      db(this.prisma).wasteFlow.count(),
      db(this.prisma).wasteFlow.count({ where: { status: 'PROCESSED' } }),
      db(this.prisma).waterAnomaly.count({ where: { resolvedAt: null } }),
      db(this.prisma).facility.count({ where: { isActive: true } }),
      db(this.prisma).waterSource.count({ where: { isActive: true } }),
      db(this.prisma).collectionVehicle.count({ where: { isActive: true } }),
    ]);

    const tonnage = await db(this.prisma).wasteFlow.aggregate({ _sum: { estimatedTonnage: true } });

    return {
      totalSites,
      totalFlows,
      processedFlows,
      processingRate: totalFlows > 0 ? +(processedFlows / totalFlows).toFixed(3) : 0,
      totalTonnageTracked: tonnage._sum.estimatedTonnage ?? 0,
      openWaterAnomalies: openAnomalies,
      activeFacilities: facilities,
      activeWaterSources: waterSources,
      activeVehicles: vehicles,
    };
  }

  // Recyclables flow — tonnage by waste type for market intelligence
  async recyclablesTonnage(lga?: string) {
    return db(this.prisma).wasteFlow.groupBy({
      by: ['wasteType'],
      where: {
        ...(lga && { lga }),
        estimatedTonnage: { not: null },
        status: { in: ['DELIVERED', 'PROCESSED'] },
      },
      _sum: { estimatedTonnage: true },
      _count: { id: true },
      orderBy: { _sum: { estimatedTonnage: 'desc' } },
    });
  }
}
