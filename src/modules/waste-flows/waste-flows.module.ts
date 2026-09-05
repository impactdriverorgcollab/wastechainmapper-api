import { Module } from '@nestjs/common';
import { WasteFlowsService } from './waste-flows.service';
import { WasteFlowsController } from './waste-flows.controller';

@Module({
  providers: [WasteFlowsService],
  controllers: [WasteFlowsController],
  exports: [WasteFlowsService],
})
export class WasteFlowsModule {}
