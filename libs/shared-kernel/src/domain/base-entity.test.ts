import { describe, it, expect } from 'vitest';
import { Entity, AggregateRoot } from './base-entity';
import { DomainEvent } from './domain-event';

// --- Test doubles ---

class TestEntity extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

class TestDomainEvent extends DomainEvent<{ value: number }> {
  get eventType() {
    return 'TestHappened';
  }
  get source() {
    return 'workalaya.test';
  }
}

class TestAggregate extends AggregateRoot<string> {
  constructor(id: string) {
    super(id);
  }

  doSomething(value: number): void {
    this.addDomainEvent(
      new TestDomainEvent({
        aggregateId: this.id,
        aggregateType: 'TestAggregate',
        payload: { value },
      }),
    );
  }

  setVersionForTest(v: number): void {
    this.version = v;
  }
}

// --- Tests ---

describe('Entity', () => {
  it('exposes id', () => {
    const e = new TestEntity('abc');
    expect(e.id).toBe('abc');
  });

  it('equals by identity', () => {
    const a = new TestEntity('1');
    const b = new TestEntity('1');
    const c = new TestEntity('2');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('equals itself', () => {
    const a = new TestEntity('1');
    expect(a.equals(a)).toBe(true);
  });
});

describe('AggregateRoot', () => {
  it('starts with no domain events', () => {
    const agg = new TestAggregate('a1');
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('collects domain events', () => {
    const agg = new TestAggregate('a1');
    agg.doSomething(42);
    agg.doSomething(99);
    expect(agg.domainEvents).toHaveLength(2);
  });

  it('pullDomainEvents returns and clears events', () => {
    const agg = new TestAggregate('a1');
    agg.doSomething(1);
    agg.doSomething(2);

    const pulled = agg.pullDomainEvents();
    expect(pulled).toHaveLength(2);
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('domainEvents returns a copy (not mutable reference)', () => {
    const agg = new TestAggregate('a1');
    agg.doSomething(1);
    const events = agg.domainEvents;
    agg.doSomething(2);
    expect(events).toHaveLength(1);
    expect(agg.domainEvents).toHaveLength(2);
  });

  it('clearDomainEvents removes all events', () => {
    const agg = new TestAggregate('a1');
    agg.doSomething(1);
    agg.clearDomainEvents();
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('tracks version', () => {
    const agg = new TestAggregate('a1');
    expect(agg.version).toBe(0);
    agg.setVersionForTest(3);
    expect(agg.version).toBe(3);
  });

  it('inherits identity equality', () => {
    const a = new TestAggregate('x');
    const b = new TestAggregate('x');
    expect(a.equals(b)).toBe(true);
  });
});
