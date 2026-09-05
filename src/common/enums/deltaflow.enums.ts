// Local enum definitions for DeltaFlow Atlas Phase 2 models.
// These mirror the Prisma schema and are used until `npx prisma generate`
// has been run after the 20260902000000_deltaflow_atlas migration is applied.
// Once generated, imports can be switched back to '@prisma/client'.

export enum FlowStatus {
  PENDING    = 'PENDING',
  COLLECTED  = 'COLLECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED  = 'DELIVERED',
  PROCESSED  = 'PROCESSED',
}

export enum FacilityType {
  COLLECTION_POINT = 'COLLECTION_POINT',
  TRANSFER_STATION = 'TRANSFER_STATION',
  RECYCLING        = 'RECYCLING',
  LANDFILL         = 'LANDFILL',
  INCINERATION     = 'INCINERATION',
}

export enum WaterSourceType {
  EXTRACTION   = 'EXTRACTION',
  DISTRIBUTION = 'DISTRIBUTION',
  CONSUMPTION  = 'CONSUMPTION',
  WASTEWATER   = 'WASTEWATER',
}

export enum WaterAnomalyType {
  LEAK                = 'LEAK',
  ILLEGAL_EXTRACTION  = 'ILLEGAL_EXTRACTION',
  CONTAMINATION       = 'CONTAMINATION',
}

export enum FloodRiskLevel {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}
