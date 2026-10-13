import { IsEnum, IsOptional, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { WasteType, SiteStatus, ConfidenceTier } from '@prisma/client';

export class CreateSiteDto {
  @ApiProperty({ description: 'Latitude (WGS84)', example: 4.8156 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude (WGS84)', example: 7.0498 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ enum: SiteStatus })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @ApiPropertyOptional({ enum: WasteType })
  @IsOptional()
  @IsEnum(WasteType)
  wasteType?: WasteType;

  @ApiPropertyOptional({ enum: ConfidenceTier })
  @IsOptional()
  @IsEnum(ConfidenceTier)
  confidenceTier?: ConfidenceTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityName?: string;

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  sourceReportIds?: string[];
}

export class UpdateSiteDto extends PartialType(CreateSiteDto) {}
