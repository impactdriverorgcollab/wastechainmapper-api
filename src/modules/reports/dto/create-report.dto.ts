import { IsString, IsEnum, IsOptional, IsUrl, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ReportSourceType, WasteType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  rawText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiProperty({ enum: ReportSourceType })
  @IsEnum(ReportSourceType)
  sourceType: ReportSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extractedLocationText?: string;

  @ApiPropertyOptional({ enum: WasteType })
  @IsOptional()
  @IsEnum(WasteType)
  extractedWasteType?: WasteType;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  extractedSeverity?: string;

  @ApiPropertyOptional({ example: 'immediate' })
  @IsOptional()
  @IsString()
  extractedUrgency?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  geocodedLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  geocodedLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedSiteId?: string;
}

// PartialType keeps the validation rules. A bare Partial<CreateReportDto> has no
// runtime metadata, so the ValidationPipe would let any field through to Prisma.
export class UpdateReportDto extends PartialType(CreateReportDto) {}

export class PlaceReportDto {
  @ApiProperty({ description: 'Gazetteer entry (community) the story is about' })
  @IsUUID()
  gazetteerId: string;
}
