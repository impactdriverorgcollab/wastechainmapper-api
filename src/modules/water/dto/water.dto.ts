import { IsEnum, IsOptional, IsNumber, IsString, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaterSourceType, WaterAnomalyType } from '../../../common/enums/deltaflow.enums';

export class CreateWaterSourceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: WaterSourceType })
  @IsEnum(WaterSourceType)
  sourceType: WaterSourceType;

  @ApiProperty({ example: 4.8156 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 7.0498 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operator?: string;

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
  @IsString()
  description?: string;
}

export class CreateWaterReadingDto {
  @ApiProperty({ description: 'Water source ID' })
  @IsString()
  sourceId: string;

  @ApiPropertyOptional({ description: 'Volume in cubic metres' })
  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  @ApiPropertyOptional({ description: 'Quality score 0.0–1.0' })
  @IsOptional()
  @IsNumber()
  qualityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ph?: number;

  @ApiPropertyOptional({ description: 'Turbidity in NTU' })
  @IsOptional()
  @IsNumber()
  turbidityNtu?: number;

  @ApiPropertyOptional({ description: 'True if from automated sensor, false if manual entry' })
  @IsOptional()
  @IsBoolean()
  isSensor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class CreateWaterAnomalyDto {
  @ApiProperty({ enum: WaterAnomalyType })
  @IsEnum(WaterAnomalyType)
  anomalyType: WaterAnomalyType;

  @ApiPropertyOptional({ description: 'Source water point ID (if known)' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
