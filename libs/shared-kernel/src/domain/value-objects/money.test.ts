import { describe, it, expect } from 'vitest';
import { Money } from './money';

describe('Money', () => {
  describe('creation', () => {
    it('creates NPR from cents', () => {
      const m = Money.npr(5000);
      expect(m.amountCents).toBe(5000);
      expect(m.currencyCode).toBe('NPR');
    });

    it('rejects non-integer cents', () => {
      expect(() => Money.fromCents(10.5)).toThrow('integer cents');
    });

    it('creates zero money', () => {
      const z = Money.zero();
      expect(z.isZero()).toBe(true);
      expect(z.amountCents).toBe(0);
    });
  });

  describe('arithmetic', () => {
    it('adds same currency', () => {
      const result = Money.npr(1000).add(Money.npr(2500));
      expect(result.amountCents).toBe(3500);
    });

    it('subtracts same currency', () => {
      const result = Money.npr(5000).subtract(Money.npr(1500));
      expect(result.amountCents).toBe(3500);
    });

    it('multiplies by factor', () => {
      const result = Money.npr(1000).multiply(1.5);
      expect(result.amountCents).toBe(1500);
    });

    it('rounds on multiply', () => {
      const result = Money.npr(1000).multiply(0.333);
      expect(result.amountCents).toBe(333);
    });

    it('calculates percentage', () => {
      const result = Money.npr(5000).percentage(10);
      expect(result.amountCents).toBe(500);
      expect(result.toString()).toBe('NPR 5.00');
    });

    it('rejects cross-currency addition', () => {
      expect(() => Money.npr(100).add(Money.fromCents(100, 'USD'))).toThrow('Currency mismatch');
    });
  });

  describe('comparison', () => {
    it('greaterThan', () => {
      expect(Money.npr(200).greaterThan(Money.npr(100))).toBe(true);
      expect(Money.npr(100).greaterThan(Money.npr(200))).toBe(false);
    });

    it('lessThan', () => {
      expect(Money.npr(100).lessThan(Money.npr(200))).toBe(true);
    });

    it('equals', () => {
      expect(Money.npr(500).equals(Money.npr(500))).toBe(true);
      expect(Money.npr(500).equals(Money.npr(501))).toBe(false);
      expect(Money.npr(500).equals(Money.fromCents(500, 'USD'))).toBe(false);
    });

    it('isPositive / isNegative', () => {
      expect(Money.npr(1).isPositive()).toBe(true);
      expect(Money.npr(-1).isNegative()).toBe(true);
      expect(Money.npr(0).isPositive()).toBe(false);
      expect(Money.npr(0).isNegative()).toBe(false);
    });
  });

  describe('display', () => {
    it('toString formats as "CURRENCY major.minor"', () => {
      expect(Money.npr(5000).toString()).toBe('NPR 50.00');
      expect(Money.npr(99).toString()).toBe('NPR 0.99');
      expect(Money.npr(0).toString()).toBe('NPR 0.00');
    });
  });
});
