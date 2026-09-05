import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

const TIER_LIMITS: Record<string, number> = {
  FREE: 100,
  PROFESSIONAL: 5_000,
  ENTERPRISE: 100_000,
};

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async issue(name: string, tier: string, ownerId?: string) {
    // Prefix makes keys identifiable in logs — never stored plain
    const raw = 'dfa_' + crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const dailyLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;

    await this.db.apiKey.create({ data: { name, tier, keyHash: hash, dailyLimit, ownerId: ownerId ?? null } });

    return {
      key: raw,
      tier,
      dailyLimit,
      warning: 'Store this key securely — it will not be shown again.',
    };
  }

  list() {
    return this.db.apiKey.findMany({
      select: {
        id: true, name: true, tier: true,
        callsToday: true, callsTotal: true, dailyLimit: true,
        isActive: true, lastUsedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const key = await this.db.apiKey.findUnique({ where: { id }, select: { id: true } });
    if (!key) throw new NotFoundException('API key not found');
    return this.db.apiKey.update({ where: { id }, data: { isActive: false } });
  }

  async stats(id: string) {
    const key = await this.db.apiKey.findUnique({
      where: { id },
      select: { id: true, name: true, tier: true, callsToday: true, callsTotal: true, dailyLimit: true, lastUsedAt: true, isActive: true, createdAt: true },
    });
    if (!key) throw new NotFoundException('API key not found');
    return key;
  }

  tierInfo() {
    return [
      { tier: 'FREE',         dailyLimit: TIER_LIMITS.FREE,         description: 'Open access for civic tech and NGO use. No SLA.' },
      { tier: 'PROFESSIONAL', dailyLimit: TIER_LIMITS.PROFESSIONAL, description: 'Analytics and business intelligence use. Standard SLA.' },
      { tier: 'ENTERPRISE',   dailyLimit: TIER_LIMITS.ENTERPRISE,   description: 'Full data access for government and industrial clients. Premium SLA.' },
    ];
  }
}
