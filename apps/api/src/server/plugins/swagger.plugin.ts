import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';

export async function registerSwagger(app: FastifyInstance, config: EnvConfig): Promise<void> {
  // Only expose docs in non-production by default
  if (config.NODE_ENV === 'production') return;

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Works by Workalaya API',
        description: 'Service marketplace platform — connecting migrant workers with home services',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${config.API_HOST}:${config.API_PORT}`,
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}