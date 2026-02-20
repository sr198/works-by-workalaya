import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';
import type { RedisClient } from '@workalaya/shared-kernel';

export async function registerRateLimit(
  app: FastifyInstance,
  config: EnvConfig,
  /** Omit to use the in-memory store (tests, single-instance dev). Pass for distributed production use. */
  redis?: RedisClient,
): Promise<void> {
  await app.register(fastifyRateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    // Redis-backed when provided; falls back to in-memory Map otherwise
    ...(redis ? { redis: redis.raw } : {}),
    // Key by authenticated user ID when available, fall back to IP
    keyGenerator: (request) => {
      const user = request.currentUser;
      return user ? `rl:user:${user.userId}` : `rl:ip:${request.ip}`;
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  });
}