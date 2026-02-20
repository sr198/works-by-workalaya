import { DomainEvent } from '../domain/domain-event';

/**
 * Event Publisher Port — outbound port for publishing domain events.
 * Infrastructure layer provides Kafka implementation.
 */
export interface EventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
