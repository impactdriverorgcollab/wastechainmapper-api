import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WasteType } from '@prisma/client';
import { FlowStatus } from '../../common/enums/deltaflow.enums';
import { CreateFlowDto, UpdateFlowStatusDto } from './dto/create-flow.dto';

// Typed accessor for new Prisma models not yet in the generated client.
// Remove the cast after running `npx prisma generate` post-migration.
const db = (p: PrismaService) => p as any;

@Injectable()
export class WasteFlowsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateFlowDto) {
    return db(this.prisma).wasteFlow.create({ data: dto });
  }

  findAll(filters: {
    status?: FlowStatus;
    wasteType?: WasteType;
    lga?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters;
    return db(this.prisma).wasteFlow.findMany({
      where: {
        ...(where.status && { status: where.status }),
        ...(where.wasteType && { wasteType: where.wasteType }),
        ...(where.lga && { lga: where.lga }),
      },
      include: {
        sourceSite: { select: { id: true, communityName: true, ward: true, lga: true } },
        destinationFacility: { select: { id: true, name: true, facilityType: true } },
        vehicle: { select: { id: true, plateNumber: true, operator: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string) {
    const flow = await db(this.prisma).wasteFlow.findUnique({
      where: { id },
      include: {
        sourceSite: true,
        destinationFacility: true,
        vehicle: true,
        routePoints: { orderBy: { recordedAt: 'asc' } },
      },
    });
    if (!flow) throw new NotFoundException(`Waste flow ${id} not found`);
    return flow;
  }

  async updateStatus(id: string, dto: UpdateFlowStatusDto) {
    await this.findOne(id);
    const now = new Date();
    const timestamps: Record<string, Date> = {};
    if (dto.status === FlowStatus.COLLECTED) timestamps.collectedAt = now;
    if (dto.status === FlowStatus.IN_TRANSIT) timestamps.inTransitAt = now;
    if (dto.status === FlowStatus.DELIVERED) timestamps.deliveredAt = now;
    if (dto.status === FlowStatus.PROCESSED) timestamps.processedAt = now;

    return db(this.prisma).wasteFlow.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes, ...timestamps },
    });
  }

  async addRoutePoint(vehicleId: string, flowId: string | undefined, latitude: number, longitude: number, speedKmh?: number) {
    const point = await db(this.prisma).vehicleRoutePoint.create({
      data: { vehicleId, flowId, latitude, longitude, speedKmh },
    });
    await this.prisma.$executeRaw`
      UPDATE "vehicle_route_points"
      SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${point.id}::uuid
    `;
    await db(this.prisma).collectionVehicle.update({
      where: { id: vehicleId },
      data: { lastSeenLat: latitude, lastSeenLng: longitude, lastSeenAt: new Date() },
    });
    return point;
  }

  flowStats(lga?: string) {
    return db(this.prisma).wasteFlow.groupBy({
      by: ['status', 'wasteType'],
      where: lga ? { lga } : undefined,
      _count: { id: true },
      _sum: { estimatedTonnage: true },
    });
  }
}
