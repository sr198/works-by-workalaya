import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '@workalaya/config';

export async function registerJwt(app: FastifyInstance, config: EnvConfig): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });
}