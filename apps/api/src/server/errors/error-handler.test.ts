import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  NotFoundError,
  ConflictError,
  DomainValidationError,
  BusinessRuleViolationError,
  UnauthorizedError,
  ForbiddenError,
} from '@workalaya/shared-kernel';
import { errorHandler } from './error-handler';

// ---- Minimal Fastify mock helpers ----

function makeRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    id: 'test-correlation-id',
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    ...overrides,
  } as unknown as FastifyRequest;
}

function makeReply(): { mock: FastifyReply; status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const mock = { status, send } as unknown as FastifyReply;
  return { mock, status, send };
}

// ---- Tests ----

describe('errorHandler', () => {
  let request: FastifyRequest;

  beforeEach(() => {
    request = makeRequest();
    process.env['NODE_ENV'] = 'test';
  });

  describe('DomainError mapping', () => {
    it('maps NotFoundError → 404', () => {
      const { mock, status } = makeReply();
      errorHandler(new NotFoundError('Booking', 'abc-123'), request, mock);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('maps ConflictError → 409', () => {
      const { mock, status } = makeReply();
      errorHandler(new ConflictError('Phone already registered'), request, mock);
      expect(status).toHaveBeenCalledWith(409);
    });

    it('maps DomainValidationError → 422', () => {
      const { mock, status } = makeReply();
      errorHandler(new DomainValidationError('Cannot book in the past'), request, mock);
      expect(status).toHaveBeenCalledWith(422);
    });

    it('maps BusinessRuleViolationError → 422', () => {
      const { mock, status } = makeReply();
      errorHandler(new BusinessRuleViolationError('Slot unavailable'), request, mock);
      expect(status).toHaveBeenCalledWith(422);
    });

    it('maps UnauthorizedError → 401', () => {
      const { mock, status } = makeReply();
      errorHandler(new UnauthorizedError(), request, mock);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('maps ForbiddenError → 403', () => {
      const { mock, status } = makeReply();
      errorHandler(new ForbiddenError(), request, mock);
      expect(status).toHaveBeenCalledWith(403);
    });

    it('includes code, message, and correlationId in the response body', () => {
      const { mock, status, send } = makeReply();
      const error = new NotFoundError('Provider', 'prov-999');
      errorHandler(error, request, mock);
      expect(status).toHaveBeenCalledWith(404);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: error.message,
          correlationId: 'test-correlation-id',
        }),
      );
    });
  });

  describe('Fastify / HTTP errors', () => {
    it('passes through Fastify errors with their statusCode', () => {
      const { mock, status } = makeReply();
      const fastifyErr = Object.assign(new Error('Not found'), { statusCode: 404, code: 'FST_ERR_NOT_FOUND' });
      errorHandler(fastifyErr, request, mock);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('uses 500 for Fastify errors with statusCode >= 500', () => {
      const { mock, status } = makeReply();
      const fastifyErr = Object.assign(new Error('oops'), { statusCode: 500 });
      errorHandler(fastifyErr, request, mock);
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('unexpected errors', () => {
    it('returns 500 for plain Error', () => {
      const { mock, status } = makeReply();
      errorHandler(new Error('something exploded'), request, mock);
      expect(status).toHaveBeenCalledWith(500);
    });

    it('hides internal message in production', () => {
      process.env['NODE_ENV'] = 'production';
      const { mock, send } = makeReply();
      errorHandler(new Error('internal secret'), request, mock);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'An unexpected error occurred' }),
      );
    });

    it('exposes message in non-production', () => {
      process.env['NODE_ENV'] = 'test';
      const { mock, send } = makeReply();
      errorHandler(new Error('internal secret'), request, mock);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'internal secret' }),
      );
    });
  });
});