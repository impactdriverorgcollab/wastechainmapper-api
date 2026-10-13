import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, HttpException, HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as crypto from 'crypto';

/**
 * Applied to every route (see AppModule). A request needs one of:
 *
 *   - an X-API-Key, which is checked and counted against the key's daily limit, or
 *   - to be a staff route (it has JwtAuthGuard), where the login check does the work, or
 *   - to be marked @Public(), such as sign-in.
 *
 * The website does not call the API from the browser. Its server forwards requests with its own
 * INTERNAL key (see wastewatch-web app/backend), so visitors need no key and partners do.
 *
 * INTERNAL keys are counted but never limited.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  private isStaffRoute(ctx: ExecutionContext): boolean {
    const guards = [
      ...(this.reflector.get<unknown[]>(GUARDS_METADATA, ctx.getHandler()) ?? []),
      ...(this.reflector.get<unknown[]>(GUARDS_METADATA, ctx.getClass()) ?? []),
    ];
    return guards.some((g) => g === JwtAuthGuard || (g as object)?.constructor === JwtAuthGuard);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) return true;
    if (this.isStaffRoute(ctx)) return true;

    const req = ctx.switchToHttp().getRequest();
    const raw = req.headers['x-api-key'];
    if (typeof raw !== 'string' || !raw) {
      throw new UnauthorizedException('An API key is required. Send it in the X-API-Key header. See /api/docs.');
    }

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const db = this.prisma as any;
    const key = await db.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || !key.isActive) throw new UnauthorizedException('Invalid or revoked API key');

    const now = new Date();

    if (key.tier === 'INTERNAL') {
      await db.apiKey.update({
        where: { id: key.id },
        data: { callsTotal: { increment: 1 }, lastUsedAt: now },
      });
      req['apiKey'] = { id: key.id, name: key.name, tier: key.tier };
      return true;
    }

    // The limit resets at midnight UTC, as the error message says. Compare UTC dates, not
    // server-local ones.
    const today = now.toISOString().slice(0, 10);
    if (key.resetAt.toISOString().slice(0, 10) !== today) {
      await db.apiKey.update({ where: { id: key.id }, data: { callsToday: 0, resetAt: now } });
      key.callsToday = 0;
    }

    // One conditional update checks the limit and counts the call together, so two
    // concurrent requests cannot both slip under the limit.
    const counted = await db.apiKey.updateMany({
      where: { id: key.id, callsToday: { lt: key.dailyLimit } },
      data: { callsToday: { increment: 1 }, callsTotal: { increment: 1 }, lastUsedAt: now },
    });
    if (counted.count === 0) {
      throw new HttpException(
        `Daily limit of ${key.dailyLimit} calls reached for the ${key.tier} tier. It resets at midnight UTC.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    req['apiKey'] = { id: key.id, name: key.name, tier: key.tier };
    return true;
  }
}
