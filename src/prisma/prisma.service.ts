import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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
    try {
      const u = new URL(rawUrl);
      u.searchParams.delete('schema');
      u.searchParams.delete('pgbouncer');
      pgUrl = u.toString();
    } catch { /* leave rawUrl as-is if parsing fails */ }

    const pool = new Pool({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
