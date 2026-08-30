import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { RadiusQueryDto, WardQueryDto } from './dto/radius-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ConfidenceTier, WasteType, SiteStatus } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SiteFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ward?: string;
  @ApiPropertyOptional({ enum: ConfidenceTier }) @IsOptional() @IsEnum(ConfidenceTier) confidenceTier?: ConfidenceTier;
  @ApiPropertyOptional({ enum: WasteType }) @IsOptional() @IsEnum(WasteType) wasteType?: WasteType;
  @ApiPropertyOptional({ enum: SiteStatus }) @IsOptional() @IsEnum(SiteStatus) status?: SiteStatus;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) limit?: number;
}

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private sites: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List dump sites with optional filters' })
  findAll(@Query() q: SiteFilterDto) {
    return this.sites.findAll(q);
  }

  @Get('spatial/radius')
  @ApiOperation({ summary: 'Find sites within radius of a point (metres)' })
  findWithinRadius(@Query() q: RadiusQueryDto) {
    return this.sites.findWithinRadius(q);
  }

  @Get('spatial/ward')
  @ApiOperation({ summary: 'Find sites within a ward boundary polygon' })
  findWithinWard(@Query() q: WardQueryDto) {
    return this.sites.findWithinWard(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sites.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  create(@Body() dto: CreateSiteDto) {
    return this.sites.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateSiteDto>) {
    return this.sites.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.sites.remove(id);
  }
}
