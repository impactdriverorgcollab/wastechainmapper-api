import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto, PlaceReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, GeocodeStatus, VerificationStatus, ReportSourceType } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

class ReportFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: GeocodeStatus }) @IsOptional() @IsEnum(GeocodeStatus) geocodeStatus?: GeocodeStatus;
  @ApiPropertyOptional({ enum: VerificationStatus }) @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @ApiPropertyOptional({ enum: ReportSourceType }) @IsOptional() @IsEnum(ReportSourceType) sourceType?: ReportSourceType;
}

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  // Reports are unverified and citizen messages can contain personal details, so reading them
  // is limited to reviewers. The public map reads verified dump sites instead.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  findAll(@Query() q: ReportFilterDto) {
    return this.reports.findAll(q);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  queue(@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.reports.findVerificationQueue(Math.min(Math.max(limit, 1), 200));
  }

  @Post(':id/place')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a report the scraper could not locate, by choosing its community from the gazetteer' })
  place(@Param('id') id: string, @Body() dto: PlaceReportDto) {
    return this.reports.placeReport(id, dto.gazetteerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.reports.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() dto: CreateReportDto) {
    return this.reports.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reports.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.reports.remove(id);
  }
}
