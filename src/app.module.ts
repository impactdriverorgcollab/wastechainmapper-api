import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SitesModule } from './modules/sites/sites.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VerificationModule } from './modules/verification/verification.module';
import { GazetteerModule } from './modules/gazetteer/gazetteer.module';

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
  ],
})
export class AppModule {}
