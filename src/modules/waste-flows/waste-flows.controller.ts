import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WasteFlowsService } from './waste-flows.service';
import { CreateFlowDto, UpdateFlowStatusDto } from './dto/create-flow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, WasteType } from '@prisma/client';
import { FlowStatus } from '../../common/enums/deltaflow.enums';
import { IsOptional, IsEnum, IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

class FlowFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: FlowStatus }) @IsOptional() @IsEnum(FlowStatus) status?: FlowStatus;
  @ApiPropertyOptional({ enum: WasteType }) @IsOptional() @IsEnum(WasteType) wasteType?: WasteType;
  @ApiPropertyOptional() @IsOptional() @IsString() lga?: string;
}

class AddRoutePointDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
  @ApiProperty() @IsUUID() vehicleId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() flowId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) speedKmh?: number;
}

@ApiTags('waste-flows')
@Controller('waste-flows')
export class WasteFlowsController {
  constructor(private service: WasteFlowsService) {}

  @Get()
  @ApiOperation({ summary: 'List waste flows with optional filters' })
  findAll(@Query() q: FlowFilterDto) {
    return this.service.findAll(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregated flow counts and tonnage by status/waste type' })
  stats(@Query('lga') lga?: string) {
    return this.service.flowStats(lga);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new waste flow record' })
  create(@Body() dto: CreateFlowDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIELD_VERIFIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Advance waste flow status with timestamped transition' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFlowStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Post('route-point')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a GPS route point for a collection vehicle' })
  addRoutePoint(@Body() dto: AddRoutePointDto) {
    return this.service.addRoutePoint(
      dto.vehicleId, dto.flowId, dto.latitude, dto.longitude, dto.speedKmh,
    );
  }
}
