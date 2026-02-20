import { describe, it, expect } from 'vitest';
import { DateVO } from './date-vo';

describe('DateVO', () => {
  it('now() returns current time', () => {
    const before = Date.now();
    const d = DateVO.now();
    const after = Date.now();
    expect(d.timestamp).toBeGreaterThanOrEqual(before);
    expect(d.timestamp).toBeLessThanOrEqual(after);
  });

  it('from() wraps a Date', () => {
    const raw = new Date('2026-03-01T10:00:00Z');
    const d = DateVO.from(raw);
    expect(d.value.getTime()).toBe(raw.getTime());
  });

  it('from() creates a defensive copy', () => {
    const raw = new Date('2026-03-01T10:00:00Z');
    const d = DateVO.from(raw);
    raw.setFullYear(2000);
    expect(d.value.getFullYear()).toBe(2026);
  });

  it('fromISO() parses ISO strings', () => {
    const d = DateVO.fromISO('2026-06-15T14:30:00Z');
    expect(d.value.toISOString()).toBe('2026-06-15T14:30:00.000Z');
  });

  it('fromISO() rejects invalid strings', () => {
    expect(() => DateVO.fromISO('not-a-date')).toThrow('Invalid ISO date');
  });

  describe('arithmetic', () => {
    const base = DateVO.fromISO('2026-01-15T12:00:00Z');

    it('addMinutes', () => {
      const result = base.addMinutes(30);
      expect(result.toISO()).toBe('2026-01-15T12:30:00.000Z');
    });

    it('addHours', () => {
      const result = base.addHours(2);
      expect(result.toISO()).toBe('2026-01-15T14:00:00.000Z');
    });

    it('addDays', () => {
      const result = base.addDays(5);
      expect(result.toISO()).toBe('2026-01-20T12:00:00.000Z');
    });
  });

  describe('comparison', () => {
    const earlier = DateVO.fromISO('2026-01-01T00:00:00Z');
    const later = DateVO.fromISO('2026-12-31T23:59:59Z');

    it('isBefore', () => {
      expect(earlier.isBefore(later)).toBe(true);
      expect(later.isBefore(earlier)).toBe(false);
    });

    it('isAfter', () => {
      expect(later.isAfter(earlier)).toBe(true);
      expect(earlier.isAfter(later)).toBe(false);
    });

    it('diffMinutes', () => {
      const a = DateVO.fromISO('2026-01-01T10:00:00Z');
      const b = DateVO.fromISO('2026-01-01T10:45:00Z');
      expect(a.diffMinutes(b)).toBe(45);
    });

    it('diffHours', () => {
      const a = DateVO.fromISO('2026-01-01T10:00:00Z');
      const b = DateVO.fromISO('2026-01-01T16:00:00Z');
      expect(a.diffHours(b)).toBe(6);
    });

    it('equals', () => {
      const a = DateVO.fromISO('2026-06-15T10:00:00Z');
      const b = DateVO.fromISO('2026-06-15T10:00:00Z');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(later)).toBe(false);
    });
  });
});
