/**
 * Domain error hierarchy.
 * These represent business-logic failures, not HTTP errors.
 * The HTTP error handler in apps/api maps these to status codes.
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain so instanceof checks work after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Entity or resource not found. Maps to HTTP 404. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`);
  }
}

/**
 * Conflict with existing state. Maps to HTTP 409.
 * e.g., duplicate phone number, overlapping booking slot.
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Domain-level validation failure. Maps to HTTP 422.
 * Distinct from schema validation (handled by Fastify/Zod).
 * e.g., booking in the past, invalid state transition.
 */
export class DomainValidationError extends DomainError {
  readonly code = 'DOMAIN_VALIDATION_ERROR';

  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

/**
 * Business rule violation. Maps to HTTP 422.
 * e.g., slot unavailable, cancellation window expired.
 */
export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(
    message: string,
    readonly ruleName?: string,
  ) {
    super(message);
  }
}

/** Not authenticated. Maps to HTTP 401. */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Authentication required') {
    super(message);
  }
}

/** Authenticated but not permitted. Maps to HTTP 403. */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Insufficient permissions') {
    super(message);
  }
}
