import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [SitesModule],
  providers: [VerificationService],
  controllers: [VerificationController],
})
export class VerificationModule {}
