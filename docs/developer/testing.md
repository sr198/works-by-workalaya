# Testing Standards & Utilities

## Overview

All tests use **Vitest v4** via `nx:run-commands`. The `@workalaya/testing` library (`libs/testing/`) provides shared utilities so each domain module can write consistent tests without boilerplate.

## Running Tests

```bash
# Affected projects only (fastest, CI-friendly)
pnpm nx affected -t test

# Specific project
pnpm nx test api
pnpm nx test shared-kernel
pnpm nx test identity   # future domain lib

# With coverage
pnpm nx test api --coverage
```

## Testing Layers

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest + fakes | Domain logic, application handlers |
| Integration | Vitest + TestDatabaseManager | Repository implementations |
| Contract | contractSuite() | All implementations of a port |
| E2E | Vitest + Fastify inject | HTTP routes end-to-end |

## `@workalaya/testing` Utilities

### TestDatabaseManager

Isolates each test suite in its own PostgreSQL schema. No schema conflicts, no cleanup pollution between suites.

```ts
import { TestDatabaseManager } from '@workalaya/testing';

let db: TestDatabaseManager;

beforeAll(async () => {
  db = await TestDatabaseManager.create(
    process.env.TEST_DATABASE_URL!,
    'booking', // schema will be: test_booking_<6hex>
  );
});

afterAll(() => db.drop());

it('inserts a row', async () => {
  await db.runSql('CREATE TABLE bookings (id uuid PRIMARY KEY)');
  await db.query("INSERT INTO bookings VALUES ('00000000-0000-0000-0000-000000000001')");
  const { rows } = await db.query('SELECT * FROM bookings');
  expect(rows).toHaveLength(1);
});
```

Pass `db.connectionString` to `PostgresClient` so repositories use the isolated schema automatically.

### FakeEventPublisher

```ts
import { FakeEventPublisher } from '@workalaya/testing';

const publisher = new FakeEventPublisher();

await handler.execute(command, publisher);

expect(publisher.publishedEvents).toContainEventOfType('BookingRequested');
publisher.clear(); // between tests
```

### FakeUnitOfWork

```ts
import { FakeUnitOfWork } from '@workalaya/testing';

const uow = new FakeUnitOfWork();

// Normal usage — executes fn directly, no real transaction
const result = await uow.execute(async (tx) => {
  return bookingRepo.save(booking, tx);
});

// Simulate DB failure
uow.simulateFailure(new Error('connection lost'));
await expect(uow.execute(() => Promise.resolve())).rejects.toThrow('connection lost');
uow.reset();
```

### contractSuite

Runs a shared set of tests against every registered implementation of a port. Use this for repository ports.

```ts
import { contractSuite } from '@workalaya/testing';

contractSuite({
  name: 'BookingRepository',
  implementations: {
    postgres: () => new PostgresBookingRepository(db),
    inmemory: () => new InMemoryBookingRepository(),
  },
  tests: (getImpl) => {
    it('returns null for unknown id', async () => {
      const repo = getImpl();
      expect(await repo.findById('unknown')).toBeNull();
    });
  },
});
```

### Builder

Extend `Builder<T>` for test data factories:

```ts
import { Builder } from '@workalaya/testing';

class BookingBuilder extends Builder<Booking> {
  protected defaults(): Booking {
    return {
      id: 'b1',
      workerId: 'w1',
      customerId: 'c1',
      startsAt: new Date('2025-01-01T10:00:00Z'),
    };
  }
}

const booking = new BookingBuilder()
  .with('workerId', 'w99')
  .build();
```

### Custom Matchers

Import once in your vitest setup file or at the top of the test:

```ts
import '@workalaya/testing'; // side-effect: registers matchers

expect(result).toBeOk();
expect(result).toBeErr();
expect(events).toContainEventOfType('BookingConfirmed');
```

Or add to `vitest.config.ts`:

```ts
setupFiles: ['@workalaya/testing'],
```

## Environment Variables for Integration Tests

```env
TEST_DATABASE_URL=postgresql://workalaya:workalaya_dev@localhost:5432/workalaya
```

Start the dev DB first: `docker compose up postgres -d`
