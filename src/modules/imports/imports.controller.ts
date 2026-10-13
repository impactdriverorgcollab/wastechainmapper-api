import { BadRequestException, Body, Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { IMPORT_KINDS, ImportKind, Row } from './import-rules';

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('imports')
export class ImportsController {
  constructor(private svc: ImportsService) {}

  @Post(':kind')
  @ApiOperation({
    summary:
      'Import a partner spreadsheet (facilities, waste-flows or water-readings). All or nothing: any bad row stops the whole file. Add ?dryRun=true to check without saving.',
  })
  run(@Param('kind') kind: string, @Query('dryRun') dryRun: string | undefined, @Body() body: { rows?: Row[] }) {
    if (!IMPORT_KINDS.includes(kind as ImportKind)) {
      throw new BadRequestException(`Unknown import "${kind}". Use one of: ${IMPORT_KINDS.join(', ')}.`);
    }
    if (!body || !Array.isArray(body.rows)) throw new BadRequestException('Send {"rows": [...]}.');
    return this.svc.run(kind as ImportKind, body.rows, dryRun === 'true');
  }
}
