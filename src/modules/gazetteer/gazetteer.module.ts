import { Module } from '@nestjs/common';
import { GazetteerService } from './gazetteer.service';
import { GazetteerController } from './gazetteer.controller';

@Module({
  providers: [GazetteerService],
  controllers: [GazetteerController],
  exports: [GazetteerService],
})
export class GazetteerModule {}
