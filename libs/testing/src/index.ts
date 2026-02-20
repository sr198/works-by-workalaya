// Database isolation
export { TestDatabaseManager } from './database/test-database';

// Fakes (test doubles)
export { FakeEventPublisher } from './fakes/fake-event-publisher';
export { FakeUnitOfWork } from './fakes/fake-unit-of-work';

// Contract testing
export { contractSuite } from './contract/contract-suite';

// Builder base
export { Builder } from './builders/builder';

// Vitest matchers — import as a side-effect to register extensions
export * from './matchers/index';
