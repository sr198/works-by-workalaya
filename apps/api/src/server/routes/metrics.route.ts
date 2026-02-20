import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';

/**
 * GET /metricz — Prometheus metrics endpoint.
 *
 * Protected by a Bearer token when METRICS_TOKEN is configured.
 * Only registered when METRICS_ENABLED is true.
 */
export async function registerMetricsRoute(
  app: FastifyInstance,
  config: Pick<EnvConfig, 'METRICS_ENABLED' | 'METRICS_TOKEN'>,
): Promise<void> {
  if (!config.METRICS_ENABLED) {
    return;
  }

  app.get(
    '/metricz',
    {
      config: { skipSwagger: true },
      schema: { hide: true },
    },
    async (request, reply) => {
      // Bearer token check
      if (config.METRICS_TOKEN) {
        const authHeader = request.headers['authorization'] ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (token !== config.METRICS_TOKEN) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
      }

      const metrics = await app.metrics.registry.metrics();
      return reply
        .header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(metrics);
    },
  );
}
