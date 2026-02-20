import { describe, it, expect } from 'vitest';
import { UserId } from './user-id';

describe('UserId', () => {
  it('generates a valid UUIDv7', () => {
    const id = UserId.generate();
    const str = id.toString();
    // UUIDv7 format: version nibble is 7
    expect(str).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => UserId.generate().toString()));
    expect(ids.size).toBe(100);
  });

  it('is time-sortable by embedded timestamp', () => {
    const id1 = UserId.generate();
    const id2 = UserId.generate();
    expect(id1.timestamp.getTime()).toBeLessThanOrEqual(id2.timestamp.getTime());
  });

  it('creates from valid UUIDv7 string', () => {
    const original = UserId.generate();
    const restored = UserId.from(original.toString());
    expect(restored.equals(original)).toBe(true);
  });

  it('rejects invalid UUID strings', () => {
    expect(() => UserId.from('not-a-uuid')).toThrow('Invalid UUIDv7');
    // UUIDv4 (version 4, not 7)
    expect(() => UserId.from('550e8400-e29b-41d4-a716-446655440000')).toThrow('Invalid UUIDv7');
  });

  it('extracts embedded timestamp', () => {
    const before = Date.now();
    const id = UserId.generate();
    const after = Date.now();

    const ts = id.timestamp.getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('equals compares by value', () => {
    const id = UserId.generate();
    const same = UserId.from(id.toString());
    const other = UserId.generate();
    expect(id.equals(same)).toBe(true);
    expect(id.equals(other)).toBe(false);
  });
});
