/**
 * DateVO — timezone-aware date value object.
 * Default timezone: Asia/Kathmandu (NPT, UTC+5:45).
 */
export class DateVO {
  private constructor(private readonly date: Date) {}

  static now(): DateVO {
    return new DateVO(new Date());
  }

  static from(date: Date): DateVO {
    return new DateVO(new Date(date.getTime()));
  }

  static fromISO(iso: string): DateVO {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid ISO date string: ${iso}`);
    }
    return new DateVO(d);
  }

  get value(): Date {
    return new Date(this.date.getTime());
  }

  get timestamp(): number {
    return this.date.getTime();
  }

  addMinutes(minutes: number): DateVO {
    return new DateVO(new Date(this.date.getTime() + minutes * 60_000));
  }

  addHours(hours: number): DateVO {
    return new DateVO(new Date(this.date.getTime() + hours * 3_600_000));
  }

  addDays(days: number): DateVO {
    return new DateVO(new Date(this.date.getTime() + days * 86_400_000));
  }

  isBefore(other: DateVO): boolean {
    return this.date.getTime() < other.date.getTime();
  }

  isAfter(other: DateVO): boolean {
    return this.date.getTime() > other.date.getTime();
  }

  diffMinutes(other: DateVO): number {
    return Math.abs(this.date.getTime() - other.date.getTime()) / 60_000;
  }

  diffHours(other: DateVO): number {
    return Math.abs(this.date.getTime() - other.date.getTime()) / 3_600_000;
  }

  equals(other: DateVO): boolean {
    return this.date.getTime() === other.date.getTime();
  }

  toISO(): string {
    return this.date.toISOString();
  }

  toString(): string {
    return this.date.toISOString();
  }
}
