/**
 * contractSuite — run a shared test suite against multiple implementations.
 *
 * Usage:
 *   contractSuite({
 *     name: 'BookingRepository',
 *     implementations: {
 *       postgres: () => new PostgresBookingRepository(db),
 *       inmemory: () => new InMemoryBookingRepository(),
 *     },
 *     tests: (getImpl) => {
 *       it('saves and retrieves a booking', async () => { ... });
 *     },
 *   });
 */
export function contractSuite<T>(options: {
  name: string;
  implementations: Record<string, () => T | Promise<T>>;
  tests: (getImpl: () => T) => void;
}): void {
  for (const [implKey, factory] of Object.entries(options.implementations)) {
    describe(`${options.name} — ${implKey}`, () => {
      let instance: T;

      beforeEach(async () => {
        instance = await factory();
      });

      options.tests(() => instance);
    });
  }
}
