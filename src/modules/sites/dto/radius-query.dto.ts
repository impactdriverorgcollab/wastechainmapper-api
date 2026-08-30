import { IsNumber, IsOptional, IsEnum, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfidenceTier, WasteType } from '@prisma/client';

export class RadiusQueryDto {
  @ApiProperty({ description: 'Centre latitude', example: 4.8156 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Centre longitude', example: 7.0498 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ description: 'Search radius in metres', example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(100000)
  radiusM: number;

  @ApiPropertyOptional({ enum: ConfidenceTier })
  @IsOptional()
  @IsEnum(ConfidenceTier)
  confidenceTier?: ConfidenceTier;

  @ApiPropertyOptional({ enum: WasteType })
  @IsOptional()
  @IsEnum(WasteType)
  wasteType?: WasteType;
}

export class WardQueryDto {
  @ApiProperty({ example: 'Diobu' })
  @IsString()
  ward: string;

  @ApiProperty({ example: 'Port Harcourt' })
  @IsString()
  lga: string;
}
