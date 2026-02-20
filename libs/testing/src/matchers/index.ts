import { expect } from 'vitest';
import type { Result } from '@workalaya/shared-kernel';
import type { DomainEvent } from '@workalaya/shared-kernel';

interface CustomMatchers<R = unknown> {
  toBeOk(): R;
  toBeErr(): R;
  toContainEventOfType(eventType: string): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeOk(received: Result<unknown, unknown>) {
    const pass = received.isOk();
    return {
      pass,
      message: () =>
        pass
          ? `Expected Result to be Err, but it was Ok(${JSON.stringify((received as { value: unknown }).value)})`
          : `Expected Result to be Ok, but it was Err(${JSON.stringify((received as { error: unknown }).error)})`,
    };
  },

  toBeErr(received: Result<unknown, unknown>) {
    const pass = received.isErr();
    return {
      pass,
      message: () =>
        pass
          ? `Expected Result to be Ok, but it was Err(${JSON.stringify((received as { error: unknown }).error)})`
          : `Expected Result to be Err, but it was Ok(${JSON.stringify((received as { value: unknown }).value)})`,
    };
  },

  toContainEventOfType(received: DomainEvent[], eventType: string) {
    const found = received.some((e) => e.eventType === eventType);
    return {
      pass: found,
      message: () =>
        found
          ? `Expected events NOT to contain type "${eventType}", but it was found`
          : `Expected events to contain type "${eventType}", but only found: [${received.map((e) => e.eventType).join(', ')}]`,
    };
  },
});
