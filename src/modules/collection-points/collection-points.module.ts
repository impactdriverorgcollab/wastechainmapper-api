import { Module } from '@nestjs/common';
import { CollectionPointsController } from './collection-points.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionPointsController],
})
export class CollectionPointsModule {}
