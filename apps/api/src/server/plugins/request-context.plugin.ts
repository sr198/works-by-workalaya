import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

/**
 * Request context plugin.
 *
 * - Echoes X-Correlation-Id (= request.id, auto-generated or from header) back in the response
 * - Adds structured completion logging (method, url, status, timing, userId)
 *
 * Wrapped with fp() so hooks apply to the parent scope regardless of where this plugin
 * is registered in the plugin tree.
 */
const requestContextPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Echo correlation ID back in every response
  app.addHook('onSend', async (request, reply) => {
    void reply.header('x-correlation-id', request.id);
  });

  // Structured per-request completion log
  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: Math.round(reply.elapsedTime),
        correlationId: request.id,
        userId: request.currentUser?.userId,
      },
      'request completed',
    );
    done();
  });
};

export const registerRequestContext = fp(requestContextPlugin, {
  name: 'request-context',
});