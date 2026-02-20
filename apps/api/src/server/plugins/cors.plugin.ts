import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';

export async function registerCors(app: FastifyInstance, config: EnvConfig): Promise<void> {
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
    credentials: true,
    maxAge: 86_400, // 24h preflight cache
  });
}