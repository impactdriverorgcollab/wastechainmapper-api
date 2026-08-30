import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GazetteerService, CreateGazetteerDto } from './gazetteer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('gazetteer')
@Controller('gazetteer')
export class GazetteerController {
  constructor(private gazetteer: GazetteerService) {}

  @Get()
  @ApiOperation({ summary: 'List all gazetteer entries, optionally filtered by LGA' })
  findAll(@Query('lga') lga?: string) {
    return this.gazetteer.findAll(lga);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Fuzzy community name lookup (used by scraper geocoding)' })
  fuzzyLookup(@Query('name') name: string, @Query('lga') lga?: string) {
    return this.gazetteer.fuzzyLookup(name, lga);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gazetteer.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() dto: CreateGazetteerDto) {
    return this.gazetteer.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateGazetteerDto>) {
    return this.gazetteer.update(id, dto);
  }
}
