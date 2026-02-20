import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { EnvConfig } from '@workalaya/config';
import type { PostgresClient, RedisClient } from '@workalaya/shared-kernel';

import { registerRequestContext } from './server/plugins/request-context.plugin';
import { registerCors } from './server/plugins/cors.plugin';
import { registerHelmet } from './server/plugins/helmet.plugin';
import { registerJwt } from './server/plugins/jwt.plugin';
import { registerRateLimit } from './server/plugins/rate-limit.plugin';
import { registerSwagger } from './server/plugins/swagger.plugin';
import { errorHandler } from './server/errors/error-handler';
import { httpStatusName, type ErrorResponse } from './server/errors/http-errors';
import { registerHealthRoutes } from './server/routes/health.route';

// Side-effect import: applies module augmentations for Fastify request types
import './server/types/auth';

export interface AppDependencies {
  config: EnvConfig;
  postgres: PostgresClient;
  redis: RedisClient;
}

/**
 * buildApp — pure Fastify app factory.
 *
 * Accepts dependencies explicitly (no global singletons) so the app is
 * fully testable: pass mock/fake deps in tests, real clients in production.
 */
export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const { config, postgres, redis } = deps;

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
        : {}),
    },
    trustProxy: true,
    // Read correlation ID from incoming header; generate a UUID if absent
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  // Zod for both request validation and response serialization
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // --- Plugins (order matters: context → cors → helmet → auth → rate-limit → docs) ---
  await app.register(registerRequestContext);
  await registerCors(app, config);
  await registerHelmet(app, config);
  await registerJwt(app, config);
  // In test mode use in-memory rate-limit store; Redis used for all other envs
  await registerRateLimit(app, config, config.NODE_ENV !== 'test' ? redis : undefined);
  await registerSwagger(app, config);

  // --- Global error handler ---
  app.setErrorHandler(errorHandler);

  // --- 404 handler (route not found bypasses setErrorHandler in Fastify) ---
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      statusCode: 404,
      error: httpStatusName(404),
      message: `Route ${request.method}:${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      correlationId: request.id,
    } satisfies ErrorResponse);
  });

  // --- Routes ---
  await app.register(registerHealthRoutes, { postgres, redis });

  return app;
}