import { DomainEvent } from './domain-event';

/**
 * Base Entity — identity-based equality.
 * Subclasses provide their own ID type (typically a branded string/UUIDv7 value object).
 */
export abstract class Entity<TId> {
  constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (other === this) return true;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}

/**
 * AggregateRoot — Entity that collects domain events during mutations.
 * Events are pulled after persistence (handler calls pullDomainEvents()).
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];
  private _version = 0;

  get version(): number {
    return this._version;
  }

  protected set version(v: number) {
    this._version = v;
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
