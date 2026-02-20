/**
 * Result<T, E> — Discriminated union for expected failures.
 * Use instead of throwing for domain-level errors.
 */

export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly ok = true as const;
  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_fallback: T): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return ok(fn(this.value));
  }

  flatMap<U, E2>(fn: (value: T) => Result<U, E2>): Result<U, E2> {
    return fn(this.value);
  }
}

export class Err<E> {
  readonly ok = false as const;
  constructor(readonly error: E) {}

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  unwrap(): never {
    throw new Error(`Called unwrap on Err: ${String(this.error)}`);
  }

  unwrapOr<T>(fallback: T): T {
    return fallback;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  flatMap<U, E2>(_fn: (value: never) => Result<U, E2>): Result<never, E> {
    return this as unknown as Result<never, E>;
  }
}

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E>(error: E): Err<E> {
  return new Err(error);
}
