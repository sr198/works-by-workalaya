import pg from 'pg';

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;
type PoolClient = Awaited<ReturnType<PoolType['connect']>>;

export interface PostgresConfig {
  connectionString: string;
  min?: number;
  max?: number;
}

export class PostgresClient {
  private pool: PoolType;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      min: config.min ?? 2,
      max: config.max ?? 10,
    });
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  get totalCount(): number {
    return this.pool.totalCount;
  }

  get idleCount(): number {
    return this.pool.idleCount;
  }

  get waitingCount(): number {
    return this.pool.waitingCount;
  }
}
