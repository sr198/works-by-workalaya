import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '@workalaya/shared-kernel';
import { mapDomainError, httpStatusName, type ErrorResponse } from './http-errors';

/**
 * Global Fastify error handler.
 *
 * Priority order:
 *  1. DomainError — mapped to appropriate HTTP status via mapDomainError()
 *  2. FastifyError (has statusCode) — Zod validation errors, 404 from route not found, etc.
 *  3. Unexpected errors — always 500, original message hidden in production
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // 1. Domain errors (business logic failures)
  if (error instanceof DomainError) {
    const { statusCode, error: errorName } = mapDomainError(error);
    const body: ErrorResponse = {
      statusCode,
      error: errorName,
      message: error.message,
      code: error.code,
      correlationId: request.id,
    };
    request.log.info({ err: error, correlationId: request.id }, 'domain error');
    void reply.status(statusCode).send(body);
    return;
  }

  // 2. Fastify / validation errors (already have statusCode)
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    const statusCode = fastifyError.statusCode;
    const body: ErrorResponse = {
      statusCode,
      error: httpStatusName(statusCode),
      message: fastifyError.message,
      code: fastifyError.code ?? 'FASTIFY_ERROR',
      correlationId: request.id,
      // Zod validation errors expose .validation with per-field details
      details: (fastifyError as FastifyError & { validation?: unknown }).validation,
    };
    if (statusCode >= 500) {
      request.log.error({ err: error, correlationId: request.id }, 'server error');
    } else {
      request.log.info({ err: error, correlationId: request.id }, 'client error');
    }
    void reply.status(statusCode).send(body);
    return;
  }

  // 3. Unexpected errors — 500, hide internals in production
  const isProd = process.env['NODE_ENV'] === 'production';
  request.log.error({ err: error, correlationId: request.id }, 'unexpected error');
  void reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: isProd ? 'An unexpected error occurred' : error.message,
    code: 'INTERNAL_ERROR',
    correlationId: request.id,
  } satisfies ErrorResponse);
}