/**
 * PhoneNumber — international format phone number.
 * Validates E.164-like format. Nepal numbers: +977XXXXXXXXXX (10 digits after country code).
 */
export class PhoneNumber {
  private constructor(private readonly value: string) {}

  static create(raw: string): PhoneNumber {
    const cleaned = raw.replace(/[\s\-()]/g, '');
    if (!isValidInternational(cleaned)) {
      throw new Error(`Invalid phone number: ${raw}`);
    }
    return new PhoneNumber(cleaned);
  }

  /** Nepal-specific shorthand: auto-prepends +977 */
  static nepal(number: string): PhoneNumber {
    const cleaned = number.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+977')) {
      return PhoneNumber.create(cleaned);
    }
    if (cleaned.startsWith('977')) {
      return PhoneNumber.create(`+${cleaned}`);
    }
    if (cleaned.startsWith('0')) {
      return PhoneNumber.create(`+977${cleaned.substring(1)}`);
    }
    return PhoneNumber.create(`+977${cleaned}`);
  }

  get countryCode(): string {
    const match = this.value.match(/^\+(\d{1,3})/);
    return match ? match[1] : '';
  }

  get nationalNumber(): string {
    const cc = this.countryCode;
    return this.value.substring(cc.length + 1); // +1 for the '+'
  }

  isNepal(): boolean {
    return this.countryCode === '977';
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

function isValidInternational(phone: string): boolean {
  // E.164: + followed by 7-15 digits
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
