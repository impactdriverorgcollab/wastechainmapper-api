import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VehiclesService, CreateVehicleDto } from './vehicles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private service: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List collection vehicles' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findAll(activeOnly !== 'false');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/route')
  @ApiOperation({ summary: 'GPS route points for a vehicle (optionally filtered by trip/flow)' })
  getRoute(
    @Param('id') id: string,
    @Query('flowId') flowId?: string,
    @Query('since') since?: string,
  ) {
    return this.service.getRoutePoints(id, flowId, since);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() dto: CreateVehicleDto) {
    return this.service.create(dto);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Push real-time GPS position for a collection vehicle' })
  updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.service.updateLocation(id, body.latitude, body.longitude);
  }
}
