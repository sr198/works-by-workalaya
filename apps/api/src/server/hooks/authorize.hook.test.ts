import { describe, it, expect, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@workalaya/shared-kernel';
import { UserRole } from '../types/auth';
import { authorize } from './authorize.hook';

function makeRequest(currentUser?: FastifyRequest['currentUser']): FastifyRequest {
  return { currentUser } as unknown as FastifyRequest;
}

const reply = {} as FastifyReply;

describe('authorize', () => {
  it('passes when user has a required role', async () => {
    const request = makeRequest({ userId: 'u1', roles: [UserRole.ADMIN], sessionId: 's1' });
    const hook = authorize([UserRole.ADMIN]);
    await expect(hook(request, reply, vi.fn())).resolves.toBeUndefined();
  });

  it('passes when user has one of multiple allowed roles', async () => {
    const request = makeRequest({ userId: 'u1', roles: [UserRole.PROVIDER], sessionId: 's1' });
    const hook = authorize([UserRole.ADMIN, UserRole.PROVIDER]);
    await expect(hook(request, reply, vi.fn())).resolves.toBeUndefined();
  });

  it('throws ForbiddenError when user lacks the required role', async () => {
    const request = makeRequest({ userId: 'u1', roles: [UserRole.CONSUMER], sessionId: 's1' });
    const hook = authorize([UserRole.ADMIN]);
    await expect(hook(request, reply, vi.fn())).rejects.toThrow(ForbiddenError);
  });

  it('throws UnauthorizedError when currentUser is not set', async () => {
    const request = makeRequest(undefined);
    const hook = authorize([UserRole.ADMIN]);
    await expect(hook(request, reply, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('creates independent guards for different role sets', async () => {
    const adminGuard = authorize([UserRole.ADMIN]);
    const consumerGuard = authorize([UserRole.CONSUMER]);

    const adminUser = makeRequest({ userId: 'u1', roles: [UserRole.ADMIN], sessionId: 's1' });
    const consumerUser = makeRequest({ userId: 'u2', roles: [UserRole.CONSUMER], sessionId: 's2' });

    await expect(adminGuard(adminUser, reply, vi.fn())).resolves.toBeUndefined();
    await expect(adminGuard(consumerUser, reply, vi.fn())).rejects.toThrow(ForbiddenError);
    await expect(consumerGuard(consumerUser, reply, vi.fn())).resolves.toBeUndefined();
    await expect(consumerGuard(adminUser, reply, vi.fn())).rejects.toThrow(ForbiddenError);
  });
});