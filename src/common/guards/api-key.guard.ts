import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw: string | undefined = req.headers['x-api-key'];
    if (!raw) throw new UnauthorizedException('Missing X-API-Key header');

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const db = this.prisma as any;
    const key = await db.apiKey.findUnique({ where: { keyHash: hash } });

    if (!key || !key.isActive) throw new UnauthorizedException('Invalid or revoked API key');

    const now = new Date();
    // Reset daily counter when calendar day has rolled over
    if (key.resetAt.toDateString() !== now.toDateString()) {
      await db.apiKey.update({ where: { id: key.id }, data: { callsToday: 0, resetAt: now } });
      key.callsToday = 0;
    }

    if (key.callsToday >= key.dailyLimit) {
      throw new ForbiddenException(
        `Daily limit of ${key.dailyLimit} calls reached for ${key.tier} tier. Resets at midnight UTC.`,
      );
    }

    await db.apiKey.update({
      where: { id: key.id },
      data: { callsToday: { increment: 1 }, callsTotal: { increment: 1 }, lastUsedAt: now },
    });

    req['apiKey'] = { id: key.id, name: key.name, tier: key.tier };
    return true;
  }
}
