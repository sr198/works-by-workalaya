import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { PostgresClient, RedisClient } from '@workalaya/shared-kernel';

interface HealthDeps {
  postgres: PostgresClient;
  redis: RedisClient;
}

/**
 * Health check routes.
 *
 * GET /healthz — liveness: is the process alive? (always 200 if running)
 * GET /readyz  — readiness: can we serve traffic? (checks DB + Redis)
 */
export async function registerHealthRoutes(
  app: FastifyInstance,
  deps: HealthDeps,
): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Liveness — no dependency checks, just confirms the process is up
  server.get(
    '/healthz',
    {
      schema: {
        description: 'Liveness probe — confirms the process is running',
        tags: ['Health'],
        response: {
          200: z.object({ status: z.literal('ok') }),
        },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  // Readiness — checks all critical dependencies
  server.get(
    '/readyz',
    {
      schema: {
        description: 'Readiness probe — confirms all dependencies are reachable',
        tags: ['Health'],
        response: {
          200: z.object({
            status: z.literal('ok'),
            checks: z.object({
              postgres: z.enum(['ok', 'fail']),
              redis: z.enum(['ok', 'fail']),
            }),
          }),
          503: z.object({
            status: z.literal('degraded'),
            checks: z.object({
              postgres: z.enum(['ok', 'fail']),
              redis: z.enum(['ok', 'fail']),
            }),
          }),
        },
      },
    },
    async (_request, reply) => {
      const [pgOk, redisOk] = await Promise.all([deps.postgres.healthCheck(), deps.redis.healthCheck()]);

      const checks = {
        postgres: pgOk ? ('ok' as const) : ('fail' as const),
        redis: redisOk ? ('ok' as const) : ('fail' as const),
      };

      if (pgOk && redisOk) {
        return { status: 'ok' as const, checks };
      }

      return reply.status(503).send({ status: 'degraded' as const, checks });
    },
  );
}