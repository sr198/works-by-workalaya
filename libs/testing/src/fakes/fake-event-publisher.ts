import type { DomainEvent } from '@workalaya/shared-kernel';
import type { EventPublisherPort } from '@workalaya/shared-kernel';

/**
 * In-memory EventPublisher for unit/integration tests.
 * Stores published events and exposes helpers for assertions.
 */
export class FakeEventPublisher implements EventPublisherPort {
  private _events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this._events.push(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this._events.push(...events);
  }

  get publishedEvents(): DomainEvent[] {
    return [...this._events];
  }

  getEventsByType<T extends DomainEvent>(type: string): T[] {
    return this._events.filter((e) => e.eventType === type) as T[];
  }

  clear(): void {
    this._events = [];
  }
}
