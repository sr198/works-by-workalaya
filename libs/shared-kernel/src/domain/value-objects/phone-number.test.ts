import { describe, it, expect } from 'vitest';
import { PhoneNumber } from './phone-number';

describe('PhoneNumber', () => {
  describe('create (international)', () => {
    it('accepts valid E.164 format', () => {
      const p = PhoneNumber.create('+9779841234567');
      expect(p.toString()).toBe('+9779841234567');
    });

    it('strips whitespace and dashes', () => {
      const p = PhoneNumber.create('+977 984-123-4567');
      expect(p.toString()).toBe('+9779841234567');
    });

    it('rejects invalid numbers', () => {
      expect(() => PhoneNumber.create('12345')).toThrow('Invalid phone');
      expect(() => PhoneNumber.create('')).toThrow('Invalid phone');
      expect(() => PhoneNumber.create('+0123456')).toThrow('Invalid phone');
    });
  });

  describe('nepal() shorthand', () => {
    it('auto-prepends +977 for local numbers', () => {
      const p = PhoneNumber.nepal('9841234567');
      expect(p.toString()).toBe('+9779841234567');
    });

    it('handles numbers with leading 0', () => {
      const p = PhoneNumber.nepal('09841234567');
      expect(p.toString()).toBe('+9779841234567');
    });

    it('passes through numbers already with +977', () => {
      const p = PhoneNumber.nepal('+9779841234567');
      expect(p.toString()).toBe('+9779841234567');
    });

    it('handles 977 without +', () => {
      const p = PhoneNumber.nepal('9779841234567');
      expect(p.toString()).toBe('+9779841234567');
    });
  });

  describe('properties', () => {
    const p = PhoneNumber.create('+9779841234567');

    it('extracts country code', () => {
      expect(p.countryCode).toBe('977');
    });

    it('extracts national number', () => {
      expect(p.nationalNumber).toBe('9841234567');
    });

    it('identifies Nepal numbers', () => {
      expect(p.isNepal()).toBe(true);
      expect(PhoneNumber.create('+14155551234').isNepal()).toBe(false);
    });
  });

  describe('equality', () => {
    it('equals by value', () => {
      const a = PhoneNumber.create('+9779841234567');
      const b = PhoneNumber.nepal('9841234567');
      expect(a.equals(b)).toBe(true);
    });

    it('different numbers are not equal', () => {
      const a = PhoneNumber.create('+9779841234567');
      const b = PhoneNumber.create('+9779849999999');
      expect(a.equals(b)).toBe(false);
    });
  });
});
