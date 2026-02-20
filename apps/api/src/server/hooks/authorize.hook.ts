import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@workalaya/shared-kernel';
import type { UserRole } from '../types/auth';

/**
 * authorize — factory that returns a preHandler hook enforcing role-based access.
 *
 * Must be used AFTER authenticate (requires request.currentUser to be populated).
 *
 * Usage:
 *   preHandler: [authenticate, authorize([UserRole.ADMIN])]
 *
 * @param allowed - at least one of these roles must be present on the user
 */
export function authorize(allowed: UserRole[]): preHandlerHookHandler {
  return async function authorizeHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.currentUser) {
      throw new UnauthorizedError();
    }

    const hasRole = allowed.some((role) => request.currentUser!.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenError(
        `Required role(s): ${allowed.join(', ')}. ` +
          `User has: ${request.currentUser.roles.join(', ')}`,
      );
    }
  };
}