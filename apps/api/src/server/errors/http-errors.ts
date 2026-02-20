import {
  DomainError,
  NotFoundError,
  ConflictError,
  DomainValidationError,
  BusinessRuleViolationError,
  UnauthorizedError,
  ForbiddenError,
} from '@workalaya/shared-kernel';

/** Standardised HTTP error response body. */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  correlationId: string;
  details?: unknown;
}

const HTTP_STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export function httpStatusName(code: number): string {
  return HTTP_STATUS_NAMES[code] ?? 'Unknown Error';
}

/**
 * Maps a DomainError to { statusCode, error } for the HTTP response.
 * Lives in the infrastructure (HTTP adapter) layer — not in the domain.
 */
export function mapDomainError(error: DomainError): { statusCode: number; error: string } {
  if (error instanceof NotFoundError) return { statusCode: 404, error: 'Not Found' };
  if (error instanceof ConflictError) return { statusCode: 409, error: 'Conflict' };
  if (error instanceof DomainValidationError)
    return { statusCode: 422, error: 'Unprocessable Entity' };
  if (error instanceof BusinessRuleViolationError)
    return { statusCode: 422, error: 'Unprocessable Entity' };
  if (error instanceof UnauthorizedError) return { statusCode: 401, error: 'Unauthorized' };
  if (error instanceof ForbiddenError) return { statusCode: 403, error: 'Forbidden' };

  // Unknown domain error — treat as server error
  return { statusCode: 500, error: 'Internal Server Error' };
}