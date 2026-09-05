import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiKeysService } from './api-keys.service';

enum ApiKeyTierDto { FREE = 'FREE', PROFESSIONAL = 'PROFESSIONAL', ENTERPRISE = 'ENTERPRISE' }

class IssueApiKeyDto {
  @ApiProperty({ example: 'RSMEPB Public Dashboard' })
  @IsString() name: string;

  @ApiProperty({ enum: ApiKeyTierDto, default: ApiKeyTierDto.FREE })
  @IsEnum(ApiKeyTierDto) tier: ApiKeyTierDto = ApiKeyTierDto.FREE;

  @ApiPropertyOptional({ description: 'UUID of the owning organisation or user' })
  @IsOptional() @IsUUID() ownerId?: string;
}

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private svc: ApiKeysService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'List available API tiers and their rate limits (public)' })
  tiers() { return this.svc.tierInfo(); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a new API key (admin only). Returns the raw key once — store it safely.' })
  issue(@Body() dto: IssueApiKeyDto) {
    return this.svc.issue(dto.name, dto.tier, dto.ownerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all API keys (key hashes hidden)' })
  list() { return this.svc.list(); }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usage statistics for a specific API key' })
  stats(@Param('id') id: string) { return this.svc.stats(id); }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke (deactivate) an API key' })
  revoke(@Param('id') id: string) { return this.svc.revoke(id); }
}
