import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@workalaya/shared-kernel';
import type { JwtPayload } from '../types/auth';

/**
 * authenticate — preHandler hook that validates the JWT and populates request.currentUser.
 *
 * Usage on a route:
 *   preHandler: [authenticate]
 *
 * Usage on a plugin prefix (all routes protected):
 *   app.addHook('preHandler', authenticate)
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as JwtPayload;
    request.currentUser = {
      userId: payload.sub,
      roles: payload.roles,
      sessionId: payload.sessionId,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
