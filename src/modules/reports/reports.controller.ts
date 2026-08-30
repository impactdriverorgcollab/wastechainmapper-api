import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, GeocodeStatus, VerificationStatus, ReportSourceType } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ReportFilterDto {
  @ApiPropertyOptional({ enum: GeocodeStatus }) @IsOptional() @IsEnum(GeocodeStatus) geocodeStatus?: GeocodeStatus;
  @ApiPropertyOptional({ enum: VerificationStatus }) @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @ApiPropertyOptional({ enum: ReportSourceType }) @IsOptional() @IsEnum(ReportSourceType) sourceType?: ReportSourceType;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) limit?: number;
}

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get()
  findAll(@Query() q: ReportFilterDto) {
    return this.reports.findAll(q);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  queue(@Query('limit') limit?: number) {
    return this.reports.findVerificationQueue(limit);
  }

  @Get(':id')
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
  update(@Param('id') id: string, @Body() dto: Partial<CreateReportDto>) {
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
