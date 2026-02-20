import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Registry, Histogram, Counter, collectDefaultMetrics } from 'prom-client';

declare module 'fastify' {
  interface FastifyInstance {
    metrics: {
      registry: Registry;
    };
  }
}

/**
 * Prometheus metrics plugin.
 *
 * Instruments every request with:
 *   - http_request_duration_seconds (Histogram)
 *   - http_requests_total (Counter)
 *
 * Also collects Node.js default process metrics.
 * Decorated as `app.metrics.registry` for use in the /metricz route.
 */
async function metricsPlugin(app: FastifyInstance): Promise<void> {
  const registry = new Registry();

  collectDefaultMetrics({ register: registry });

  const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const requestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  // Start timer on each request
  app.addHook('onRequest', (request, _reply, done) => {
    (request as unknown as { _metricsTimer: () => number })._metricsTimer =
      requestDuration.startTimer();
    done();
  });

  // Record metrics when response is sent
  app.addHook('onResponse', (request, reply, done) => {
    const route = request.routeOptions?.url ?? 'unknown';
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    };

    const timer = (request as unknown as { _metricsTimer?: () => void })._metricsTimer;
    if (timer) {
      timer(labels);
    }
    requestsTotal.inc(labels);
    done();
  });

  app.decorate('metrics', { registry });
}

export const registerMetrics = fp(metricsPlugin, {
  name: 'metrics',
});
