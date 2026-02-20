import { randomBytes } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';

/**
 * TestDatabaseManager — creates an isolated PostgreSQL schema per test suite.
 *
 * Usage (in vitest beforeAll / globalSetup):
 *   const db = await TestDatabaseManager.create(process.env.TEST_DATABASE_URL!, 'booking');
 *   // pass db.connectionString to PostgresClient
 *   afterAll(() => db.drop());
 */
export class TestDatabaseManager {
  private readonly pool: Pool;
  readonly schema: string;
  readonly connectionString: string;

  private constructor(baseUrl: string, schema: string) {
    this.schema = schema;
    // Append search_path override so any raw queries land in the right schema
    const separator = baseUrl.includes('?') ? '&' : '?';
    this.connectionString = `${baseUrl}${separator}options=-c search_path%3D${schema}`;
    this.pool = new Pool({ connectionString: this.connectionString });
  }

  /** Create an isolated schema and return a ready-to-use manager. */
  static async create(connectionString: string, suiteName: string): Promise<TestDatabaseManager> {
    const suffix = randomBytes(3).toString('hex'); // 6 hex chars
    const schema = `test_${suiteName}_${suffix}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Use base URL (without potential existing search_path) to create the schema
    const setupPool = new Pool({ connectionString });
    try {
      await setupPool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    } finally {
      await setupPool.end();
    }

    return new TestDatabaseManager(connectionString, schema);
  }

  /** Run a SQL string within the test schema (for seeding / manual DDL). */
  async runSql(sql: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${this.schema}"`);
      await client.query(sql);
    } finally {
      client.release();
    }
  }

  /** Execute a parameterised query within the test schema. */
  async query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${this.schema}"`);
      const result = await client.query(sql, params);
      return { rows: result.rows as Record<string, unknown>[] };
    } finally {
      client.release();
    }
  }

  /** Drop the isolated schema and release all pool connections. */
  async drop(): Promise<void> {
    await this.pool.end();
    // Need a fresh pool on the default schema to drop our test schema
    const cleanupPool = new Pool({
      connectionString: this.connectionString.split('?')[0],
    });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`);
    } finally {
      await cleanupPool.end();
    }
  }
}
