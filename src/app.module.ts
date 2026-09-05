import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SitesModule } from './modules/sites/sites.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VerificationModule } from './modules/verification/verification.module';
import { GazetteerModule } from './modules/gazetteer/gazetteer.module';
import { CollectionPointsModule } from './modules/collection-points/collection-points.module';
import { WasteFlowsModule } from './modules/waste-flows/waste-flows.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { WaterModule } from './modules/water/water.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FloodZonesModule } from './modules/flood-zones/flood-zones.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SitesModule,
    ReportsModule,
    VerificationModule,
    GazetteerModule,
    CollectionPointsModule,
    WasteFlowsModule,
    FacilitiesModule,
    WaterModule,
    VehiclesModule,
    AnalyticsModule,
    FloodZonesModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
