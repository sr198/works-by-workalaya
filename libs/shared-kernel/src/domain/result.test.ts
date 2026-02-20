import { describe, it, expect } from 'vitest';
import { ok, err, Result } from './result';

describe('Result', () => {
  describe('Ok', () => {
    it('isOk returns true', () => {
      const result = ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('unwrap returns value', () => {
      expect(ok('hello').unwrap()).toBe('hello');
    });

    it('unwrapOr returns value, ignoring fallback', () => {
      expect(ok(42).unwrapOr(0)).toBe(42);
    });

    it('map transforms the value', () => {
      const result = ok(10).map((n) => n * 2);
      expect(result.unwrap()).toBe(20);
    });

    it('flatMap chains results', () => {
      const divide = (a: number, b: number): Result<number, string> =>
        b === 0 ? err('division by zero') : ok(a / b);

      const result = ok(10).flatMap((n) => divide(n, 2));
      expect(result.unwrap()).toBe(5);
    });

    it('type-narrows with isOk', () => {
      const result: Result<number, string> = ok(42);
      if (result.isOk()) {
        // TypeScript should know this is Ok<number>
        const val: number = result.value;
        expect(val).toBe(42);
      }
    });
  });

  describe('Err', () => {
    it('isErr returns true', () => {
      const result = err('fail');
      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
    });

    it('unwrap throws', () => {
      expect(() => err('oops').unwrap()).toThrow('Called unwrap on Err: oops');
    });

    it('unwrapOr returns fallback', () => {
      expect(err('oops').unwrapOr(99)).toBe(99);
    });

    it('map is a no-op', () => {
      const result: Result<number, string> = err('fail');
      const mapped = result.map((n) => n * 2);
      expect(mapped.isErr()).toBe(true);
    });

    it('flatMap is a no-op', () => {
      const result: Result<number, string> = err('fail');
      const chained = result.flatMap((n) => ok(n * 2));
      expect(chained.isErr()).toBe(true);
    });

    it('type-narrows with isErr', () => {
      const result: Result<number, string> = err('bad');
      if (result.isErr()) {
        const e: string = result.error;
        expect(e).toBe('bad');
      }
    });
  });

  describe('ok discriminant', () => {
    it('ok field is true for Ok, false for Err', () => {
      expect(ok(1).ok).toBe(true);
      expect(err('x').ok).toBe(false);
    });
  });
});
