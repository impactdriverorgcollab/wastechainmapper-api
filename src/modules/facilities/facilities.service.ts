import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacilityType } from '../../common/enums/deltaflow.enums';
import { CreateFacilityDto } from './dto/create-facility.dto';

const db = (p: PrismaService) => p as any;

@Injectable()
export class FacilitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFacilityDto) {
    const { latitude, longitude, ...rest } = dto;
    const facility = await db(this.prisma).facility.create({ data: { latitude, longitude, ...rest } });
    await this.prisma.$executeRaw`
      UPDATE "facilities"
      SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${facility.id}::uuid
    `;
    return facility;
  }

  findAll(filters: { facilityType?: FacilityType; lga?: string; isActive?: boolean }) {
    return db(this.prisma).facility.findMany({
      where: {
        ...(filters.facilityType && { facilityType: filters.facilityType }),
        ...(filters.lga && { lga: filters.lga }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ facilityType: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const f = await db(this.prisma).facility.findUnique({
      where: { id },
      include: { incomingFlows: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!f) throw new NotFoundException(`Facility ${id} not found`);
    return f;
  }

  async update(id: string, dto: Partial<CreateFacilityDto>) {
    await this.findOne(id);
    const { latitude, longitude, ...rest } = dto;
    const facility = await db(this.prisma).facility.update({ where: { id }, data: { latitude, longitude, ...rest } });
    if (latitude !== undefined && longitude !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE "facilities"
        SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        WHERE id = ${id}::uuid
      `;
    }
    return facility;
  }

  async remove(id: string) {
    await this.findOne(id);
    return db(this.prisma).facility.delete({ where: { id } });
  }
}
