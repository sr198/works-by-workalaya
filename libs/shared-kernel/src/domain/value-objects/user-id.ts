/**
 * UserId — UUIDv7 branded string.
 * UUIDv7 is time-sortable: the first 48 bits are a Unix timestamp in milliseconds.
 */
export class UserId {
  private constructor(private readonly value: string) {}

  static generate(): UserId {
    return new UserId(generateUUIDv7());
  }

  static from(value: string): UserId {
    if (!isValidUUIDv7(value)) {
      throw new Error(`Invalid UUIDv7: ${value}`);
    }
    return new UserId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  /** Extract the timestamp embedded in the UUIDv7 */
  get timestamp(): Date {
    const hex = this.value.replace(/-/g, '').substring(0, 12);
    const ms = parseInt(hex, 16);
    return new Date(ms);
  }
}

function isValidUUIDv7(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function generateUUIDv7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');

  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Version 7: set bits 48-51 to 0111
  randomBytes[0] = (randomBytes[0] & 0x0f) | 0x70;
  // Variant: set bits 64-65 to 10
  randomBytes[2] = (randomBytes[2] & 0x3f) | 0x80;

  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hex = timeHex + randomHex;
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}
