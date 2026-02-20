import { randomUUID } from 'node:crypto';

/**
 * Domain event following CloudEvents v1.0 spec with domain envelope.
 * All events on Kafka use this shape.
 */
export interface DomainEventProps<T extends Record<string, unknown> = Record<string, unknown>> {
  aggregateId: string;
  aggregateType: string;
  payload: T;
  metadata?: Partial<EventMetadata>;
}

export interface EventMetadata {
  causationId: string;
  correlationId: string;
  userId: string;
  version: number;
}

export interface SerializedDomainEvent {
  id: string;
  source: string;
  type: string;
  specversion: '1.0';
  time: string;
  data: {
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
    metadata: EventMetadata;
  };
}

export abstract class DomainEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: T;
  readonly metadata: EventMetadata;

  constructor(props: DomainEventProps<T>) {
    this.id = randomUUID();
    this.occurredAt = new Date();
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.payload = props.payload;
    this.metadata = {
      causationId: props.metadata?.causationId ?? this.id,
      correlationId: props.metadata?.correlationId ?? this.id,
      userId: props.metadata?.userId ?? 'system',
      version: props.metadata?.version ?? 1,
    };
  }

  /** CloudEvents type field, e.g. 'BookingRequested' */
  abstract get eventType(): string;

  /** CloudEvents source field, e.g. 'workalaya.booking' */
  abstract get source(): string;

  toCloudEvent(): SerializedDomainEvent {
    return {
      id: this.id,
      source: this.source,
      type: this.eventType,
      specversion: '1.0',
      time: this.occurredAt.toISOString(),
      data: {
        aggregateId: this.aggregateId,
        aggregateType: this.aggregateType,
        payload: this.payload as Record<string, unknown>,
        metadata: this.metadata,
      },
    };
  }
}
