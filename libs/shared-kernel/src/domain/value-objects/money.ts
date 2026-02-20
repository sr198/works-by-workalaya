/**
 * Money — integer cents, no floating point (ADR-009).
 * Default currency: NPR (Nepalese Rupee).
 */
export class Money {
  private constructor(
    private readonly cents: number,
    private readonly currency: string,
  ) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money amount must be integer cents, got: ${cents}`);
    }
  }

  static npr(cents: number): Money {
    return new Money(cents, 'NPR');
  }

  static fromCents(cents: number, currency = 'NPR'): Money {
    return new Money(cents, currency);
  }

  static zero(currency = 'NPR'): Money {
    return new Money(0, currency);
  }

  get amountCents(): number {
    return this.cents;
  }

  get currencyCode(): string {
    return this.currency;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  /** Calculate percentage: e.g. percentage(10) returns 10% of this amount */
  percentage(pct: number): Money {
    return new Money(Math.round(this.cents * (pct / 100)), this.currency);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  /** Display as "NPR 50.00" */
  toString(): string {
    const major = (this.cents / 100).toFixed(2);
    return `${this.currency} ${major}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
