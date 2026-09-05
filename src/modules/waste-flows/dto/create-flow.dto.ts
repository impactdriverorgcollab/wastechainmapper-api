import { IsEnum, IsOptional, IsNumber, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WasteType } from '@prisma/client';
import { FlowStatus } from '../../../common/enums/deltaflow.enums';

export class CreateFlowDto {
  @ApiProperty({ enum: WasteType })
  @IsEnum(WasteType)
  wasteType: WasteType;

  @ApiPropertyOptional({ enum: FlowStatus })
  @IsOptional()
  @IsEnum(FlowStatus)
  status?: FlowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedTonnage?: number;

  @ApiPropertyOptional({ description: 'Source dump site ID' })
  @IsOptional()
  @IsUUID()
  sourceSiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLng?: number;

  @ApiPropertyOptional({ description: 'Destination facility ID' })
  @IsOptional()
  @IsUUID()
  destinationFacilityId?: string;

  @ApiPropertyOptional({ description: 'Assigned vehicle ID' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inTransitAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFlowStatusDto {
  @ApiProperty({ enum: FlowStatus })
  @IsEnum(FlowStatus)
  status: FlowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
