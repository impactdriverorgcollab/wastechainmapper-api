import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('collection-points')
@Controller('collection-points')
export class CollectionPointsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all active waste collection points' })
  findAll() {
    return this.prisma.collectionPoint.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
