// Domain
export { Entity, AggregateRoot } from './domain/base-entity';
export { DomainEvent } from './domain/domain-event';
export type { DomainEventProps, EventMetadata, SerializedDomainEvent } from './domain/domain-event';
export { Ok, Err, ok, err } from './domain/result';
export type { Result } from './domain/result';

// Value Objects
export { UserId } from './domain/value-objects/user-id';
export { Money } from './domain/value-objects/money';
export { GeoPoint } from './domain/value-objects/geo-point';
export { DateVO } from './domain/value-objects/date-vo';
export { PhoneNumber } from './domain/value-objects/phone-number';

// Application
export type { Command, CommandHandler, CommandBus } from './application/command-bus';
export type { Query, QueryHandler, QueryBus } from './application/query-bus';
export type { UnitOfWork, TransactionContext } from './application/unit-of-work';
export type { EventPublisherPort } from './application/event-publisher.port';

// Infrastructure
export { PostgresClient } from './infrastructure/postgres-client';
export type { PostgresConfig } from './infrastructure/postgres-client';
export { KafkaClient } from './infrastructure/kafka-client';
export type { KafkaConfig } from './infrastructure/kafka-client';
export { RedisClient } from './infrastructure/redis-client';
export type { RedisConfig } from './infrastructure/redis-client';
