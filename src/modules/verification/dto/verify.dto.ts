import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

// UNVERIFIED -> CORROBORATED: a reviewer checked the source and the location (desk check).
// -> FIELD_VERIFIED: someone visited or has first-hand evidence. Final.
// -> REJECTED: not a real or locatable incident. Can be reopened.
const ALLOWED_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  UNVERIFIED:     [VerificationStatus.CORROBORATED, VerificationStatus.FIELD_VERIFIED, VerificationStatus.REJECTED],
  CORROBORATED:   [VerificationStatus.FIELD_VERIFIED, VerificationStatus.REJECTED],
  FIELD_VERIFIED: [],
  REJECTED:       [VerificationStatus.UNVERIFIED],
};

export function isValidTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class VerifyReportDto {
  @ApiProperty({ enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  toStatus: VerificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Link to an existing dump site, or omit to auto-create one' })
  @IsOptional()
  @IsUUID()
  linkedSiteId?: string;
}
