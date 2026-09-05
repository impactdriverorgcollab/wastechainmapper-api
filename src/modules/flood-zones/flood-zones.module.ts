import { Module } from '@nestjs/common';
import { FloodZonesController } from './flood-zones.controller';

@Module({
  controllers: [FloodZonesController],
})
export class FloodZonesModule {}
