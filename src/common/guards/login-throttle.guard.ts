import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/**
 * Limits login attempts per client IP and email in a sliding window.
 * State is in memory, which is enough for one API instance. If the API is
 * scaled out, move the counters to Redis or use @nestjs/throttler with a store.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const keys = [`ip:${req.ip}`, `email:${email}`];
    const now = Date.now();

    for (const key of keys) {
      const recent = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
      if (recent.length >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
        req.res?.setHeader('Retry-After', String(retryAfter));
        throw new HttpException(
          'Too many sign-in attempts. Wait a few minutes and try again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      recent.push(now);
      this.hits.set(key, recent);
    }

    // Keep the map from growing without bound.
    if (this.hits.size > 5000) {
      for (const [key, times] of this.hits) {
        if (times.every((t) => now - t >= WINDOW_MS)) this.hits.delete(key);
      }
    }
    return true;
  }
}
