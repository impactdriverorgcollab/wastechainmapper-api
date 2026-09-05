import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WaterService } from './water.service';
import {
  CreateWaterSourceDto, CreateWaterReadingDto, CreateWaterAnomalyDto,
} from './dto/water.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { WaterSourceType, WaterAnomalyType } from '../../common/enums/deltaflow.enums';
import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

class SourceFilterDto {
  @ApiPropertyOptional({ enum: WaterSourceType }) @IsOptional() @IsEnum(WaterSourceType) sourceType?: WaterSourceType;
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
}

class AnomalyFilterDto {
  @ApiPropertyOptional({ enum: WaterAnomalyType }) @IsOptional() @IsEnum(WaterAnomalyType) anomalyType?: WaterAnomalyType;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() unresolvedOnly?: boolean;
}

@ApiTags('water')
@Controller('water')
export class WaterController {
  constructor(private service: WaterService) {}

  // ── Water sources ────────────────────────────────────────────────────────────

  @Get('sources')
  @ApiOperation({ summary: 'List water extraction, distribution, consumption and wastewater points' })
  findAllSources(@Query() q: SourceFilterDto) {
    return this.service.findAllSources(q);
  }

  @Get('sources/:id')
  findOneSource(@Param('id') id: string) {
    return this.service.findOneSource(id);
  }

  @Post('sources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  createSource(@Body() dto: CreateWaterSourceDto) {
    return this.service.createSource(dto);
  }

  // ── Readings ─────────────────────────────────────────────────────────────────

  @Get('sources/:id/readings')
  @ApiOperation({ summary: 'Time-series readings for a water source (sensor or manual)' })
  findReadings(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findReadings(id, from, to);
  }

  @Post('readings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log a water reading (sensor push or manual data upload)' })
  createReading(@Body() dto: CreateWaterReadingDto) {
    return this.service.createReading(dto);
  }

  // ── Anomalies ─────────────────────────────────────────────────────────────────

  @Get('anomalies')
  @ApiOperation({ summary: 'List anomalies — leaks, illegal extraction, contamination hotspots' })
  findAnomalies(@Query() q: AnomalyFilterDto) {
    return this.service.findAnomalies(q);
  }

  @Post('anomalies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a water anomaly' })
  createAnomaly(@Body() dto: CreateWaterAnomalyDto) {
    return this.service.createAnomaly(dto);
  }

  @Patch('anomalies/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a water anomaly as resolved' })
  resolveAnomaly(@Param('id') id: string) {
    return this.service.resolveAnomaly(id);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Water monitoring summary stats' })
  dashboard() {
    return this.service.dashboardStats();
  }
}
