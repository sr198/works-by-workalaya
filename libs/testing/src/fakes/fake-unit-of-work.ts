import type { UnitOfWork, TransactionContext } from '@workalaya/shared-kernel';

/** Fake TransactionContext with a null client — sufficient for unit tests. */
const FAKE_TX: TransactionContext = { client: null };

/**
 * In-memory UnitOfWork for unit/integration tests.
 * Executes the work function directly without a real database transaction.
 */
export class FakeUnitOfWork implements UnitOfWork {
  private _failureError: Error | null = null;

  async execute<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    if (this._failureError) {
      throw this._failureError;
    }
    return fn(FAKE_TX);
  }

  /**
   * Configure the UoW to throw before calling fn on the next execute() call.
   * Useful for testing rollback / compensating-transaction scenarios.
   */
  simulateFailure(error: Error): void {
    this._failureError = error;
  }

  /** Reset simulated failure state. */
  reset(): void {
    this._failureError = null;
  }
}
