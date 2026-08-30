import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

// MVP: only approve (→FIELD_VERIFIED) or reject (→REJECTED) from UNVERIFIED
const MVP_ALLOWED_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  UNVERIFIED:     [VerificationStatus.CORROBORATED, VerificationStatus.FIELD_VERIFIED, VerificationStatus.REJECTED],
  CORROBORATED:   [VerificationStatus.FIELD_VERIFIED, VerificationStatus.REJECTED],
  FIELD_VERIFIED: [],
  REJECTED:       [VerificationStatus.UNVERIFIED],
};

export function isValidTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  return MVP_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class VerifyReportDto {
  @ApiProperty({ enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  toStatus: VerificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Link to an existing dump site, or omit to auto-create one' })
  @IsOptional()
  @IsUUID()
  linkedSiteId?: string;
}
