import { describe, it, expect } from 'vitest';
import { DomainEvent, DomainEventProps, SerializedDomainEvent } from './domain-event';

class TestEvent extends DomainEvent<{ bookingId: string }> {
  get eventType(): string {
    return 'TestEventOccurred';
  }
  get source(): string {
    return 'workalaya.test';
  }
}

describe('DomainEvent', () => {
  const baseProps: DomainEventProps<{ bookingId: string }> = {
    aggregateId: 'agg-123',
    aggregateType: 'Booking',
    payload: { bookingId: 'b-456' },
  };

  it('assigns a UUID id', () => {
    const event = new TestEvent(baseProps);
    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('records occurredAt timestamp', () => {
    const before = new Date();
    const event = new TestEvent(baseProps);
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('stores aggregate info and payload', () => {
    const event = new TestEvent(baseProps);
    expect(event.aggregateId).toBe('agg-123');
    expect(event.aggregateType).toBe('Booking');
    expect(event.payload).toEqual({ bookingId: 'b-456' });
  });

  it('defaults metadata when not provided', () => {
    const event = new TestEvent(baseProps);
    expect(event.metadata.causationId).toBe(event.id);
    expect(event.metadata.correlationId).toBe(event.id);
    expect(event.metadata.userId).toBe('system');
    expect(event.metadata.version).toBe(1);
  });

  it('accepts explicit metadata', () => {
    const event = new TestEvent({
      ...baseProps,
      metadata: {
        causationId: 'cmd-1',
        correlationId: 'corr-1',
        userId: 'user-1',
        version: 3,
      },
    });
    expect(event.metadata).toEqual({
      causationId: 'cmd-1',
      correlationId: 'corr-1',
      userId: 'user-1',
      version: 3,
    });
  });

  describe('toCloudEvent', () => {
    it('serializes to CloudEvents v1.0 format', () => {
      const event = new TestEvent(baseProps);
      const ce: SerializedDomainEvent = event.toCloudEvent();

      expect(ce.specversion).toBe('1.0');
      expect(ce.type).toBe('TestEventOccurred');
      expect(ce.source).toBe('workalaya.test');
      expect(ce.id).toBe(event.id);
      expect(ce.time).toBe(event.occurredAt.toISOString());
      expect(ce.data.aggregateId).toBe('agg-123');
      expect(ce.data.aggregateType).toBe('Booking');
      expect(ce.data.payload).toEqual({ bookingId: 'b-456' });
      expect(ce.data.metadata).toEqual(event.metadata);
    });

    it('produces valid JSON', () => {
      const event = new TestEvent(baseProps);
      const json = JSON.stringify(event.toCloudEvent());
      const parsed = JSON.parse(json);
      expect(parsed.specversion).toBe('1.0');
      expect(parsed.data.payload.bookingId).toBe('b-456');
    });
  });
});
