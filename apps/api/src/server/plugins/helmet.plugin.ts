import fastifyHelmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';

export async function registerHelmet(app: FastifyInstance, config: EnvConfig): Promise<void> {
  await app.register(fastifyHelmet, {
    // In non-production, disable CSP so Swagger UI (inline scripts/styles) works
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });
}