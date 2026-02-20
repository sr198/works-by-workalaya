/**
 * Unit of Work — transaction boundary abstraction.
 * Wraps a database transaction: all or nothing.
 */
export interface UnitOfWork {
  /**
   * Execute work within a transaction.
   * If fn throws, the transaction is rolled back.
   * If fn resolves, the transaction is committed.
   */
  execute<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

/**
 * Transaction context passed to repositories within a unit of work.
 * Repositories use this to participate in the same transaction.
 */
export interface TransactionContext {
  /** Opaque handle — the actual DB client/transaction object */
  readonly client: unknown;
}
