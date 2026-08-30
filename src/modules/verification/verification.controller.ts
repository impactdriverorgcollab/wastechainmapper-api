import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { VerifyReportDto } from './dto/verify.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('verification')
@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private verification: VerificationService) {}

  @Post('reports/:id')
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiOperation({ summary: 'Approve, reject, or escalate a scraped report' })
  verifyReport(
    @Param('id') reportId: string,
    @Body() dto: VerifyReportDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.verification.verifyReport(reportId, dto, user.id);
  }
}
