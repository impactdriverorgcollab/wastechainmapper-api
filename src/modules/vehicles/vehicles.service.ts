import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateVehicleDto {
  @ApiProperty() @IsString() @MinLength(3) plateNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) capacityM3?: number;
}

export class UpdateLocationDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
}

const db = (p: PrismaService) => p as any;

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateVehicleDto) {
    return db(this.prisma).collectionVehicle.create({ data: dto });
  }

  findAll(activeOnly = true) {
    return db(this.prisma).collectionVehicle.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { plateNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const v = await db(this.prisma).collectionVehicle.findUnique({
      where: { id },
      include: {
        flows: { take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, wasteType: true, createdAt: true } },
      },
    });
    if (!v) throw new NotFoundException(`Vehicle ${id} not found`);
    return v;
  }

  getRoutePoints(vehicleId: string, flowId?: string, since?: string) {
    return db(this.prisma).vehicleRoutePoint.findMany({
      where: {
        vehicleId,
        ...(flowId && { flowId }),
        ...(since && { recordedAt: { gte: new Date(since) } }),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async updateLocation(id: string, latitude: number, longitude: number) {
    const v = await db(this.prisma).collectionVehicle.update({
      where: { id },
      data: { lastSeenLat: latitude, lastSeenLng: longitude, lastSeenAt: new Date() },
    });
    const point = await db(this.prisma).vehicleRoutePoint.create({
      data: { vehicleId: id, latitude, longitude },
    });
    await this.prisma.$executeRaw`
      UPDATE "vehicle_route_points"
      SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${point.id}::uuid
    `;
    return v;
  }
}
