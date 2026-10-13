import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // Use the pg JavaScript driver instead of Prisma's Rust binary engine.
    // This ensures the same Node.js network stack is used, which resolves
    // P1001 connectivity failures on networks where the Rust engine cannot
    // reach the Supabase pooler.
    const rawUrl = process.env.DATABASE_URL ?? '';
    // Strip Prisma-specific query params before passing to pg
    let pgUrl = rawUrl;
    let isLocal = false;
    try {
      const u = new URL(rawUrl);
      u.searchParams.delete('schema');
      u.searchParams.delete('pgbouncer');
      pgUrl = u.toString();
      isLocal = LOCAL_HOSTS.has(u.hostname);
    } catch { /* leave rawUrl as-is if parsing fails */ }

    // TLS is on for any hosted database and off for local Docker, which has no TLS.
    // DATABASE_SSL=true|false overrides the guess. Hosted poolers often present a
    // certificate the Node trust store does not know, so verification stays relaxed
    // unless DATABASE_SSL_STRICT=true.
    const sslSetting = process.env.DATABASE_SSL;
    const useSsl = sslSetting ? sslSetting === 'true' : !isLocal;
    const ssl = useSsl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' }
      : undefined;

    const pool = new Pool({ connectionString: pgUrl, ssl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
