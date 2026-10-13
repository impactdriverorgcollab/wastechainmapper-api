import { IsEnum, IsOptional, IsNumber, IsString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FacilityType } from '../../../common/enums/deltaflow.enums';

export class CreateFacilityDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: FacilityType })
  @IsEnum(FacilityType)
  facilityType: FacilityType;

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

  @ApiPropertyOptional({ description: 'Processing capacity in tonnes per day' })
  @IsOptional()
  @IsNumber()
  capacityTpd?: number;

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
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
