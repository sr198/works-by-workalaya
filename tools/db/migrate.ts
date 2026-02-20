import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Client } = pg;

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, 'migrations');
const MIGRATION_UP_FILENAME_REGEX = /^\d{14}_[a-z0-9][a-z0-9_-]*\.up\.sql$/;
const MIGRATION_FILENAME_HINT =
  'Expected format: YYYYMMDDHHmmss_description.up.sql (example: 20260220103045_create_users_table.up.sql)';

interface Migration {
  id: string;
  name: string;
  upPath: string;
  downPath: string;
}

const MIGRATION_LOCK_KEY = 8401122334455667n;

async function ensureMigrationTable(client: InstanceType<typeof Client>): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client: InstanceType<typeof Client>): Promise<Set<string>> {
  const result = await client.query('SELECT id FROM public.schema_migrations ORDER BY id');
  return new Set(result.rows.map((r: { id: string }) => r.id));
}

async function getLastAppliedMigrationId(
  client: InstanceType<typeof Client>,
): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM public.schema_migrations
      ORDER BY applied_at DESC, id DESC
      LIMIT 1
    `,
  );
  return result.rows[0]?.id ?? null;
}

function discoverMigrations(): Migration[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.up.sql'));
  const seen = new Set<string>();
  const migrations: Migration[] = [];

  for (const file of files) {
    if (!MIGRATION_UP_FILENAME_REGEX.test(file)) {
      throw new Error(`Invalid migration filename: ${file}. ${MIGRATION_FILENAME_HINT}`);
    }

    const id = file.replace('.up.sql', '');
    if (seen.has(id)) {
      throw new Error(`Duplicate migration id detected: ${id}`);
    }
    seen.add(id);

    const downPath = path.join(MIGRATIONS_DIR, `${id}.down.sql`);
    if (!fs.existsSync(downPath)) {
      throw new Error(`Missing down migration for ${file}. Expected: ${id}.down.sql`);
    }

    migrations.push({
      id,
      name: id,
      upPath: path.join(MIGRATIONS_DIR, file),
      downPath,
    });
  }

  return migrations.sort((a, b) => a.id.localeCompare(b.id));
}

async function up(client: InstanceType<typeof Client>): Promise<void> {
  await ensureMigrationTable(client);
  const applied = await getAppliedMigrations(client);
  const migrations = discoverMigrations();
  let count = 0;

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    console.log(`  ↑ Applying: ${migration.name}`);
    const sql = fs.readFileSync(migration.upPath, 'utf-8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (id) VALUES ($1)', [migration.id]);
      await client.query('COMMIT');
      count++;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  ✗ Failed: ${migration.name}`);
      throw error;
    }
  }

  console.log(count === 0 ? '  No new migrations' : `  ✓ Applied ${count} migration(s)`);
}

async function down(client: InstanceType<typeof Client>): Promise<void> {
  await ensureMigrationTable(client);
  const lastId = await getLastAppliedMigrationId(client);
  if (!lastId) {
    console.log('  No migrations to revert');
    return;
  }

  const migration: Migration = {
    id: lastId,
    name: lastId,
    upPath: path.join(MIGRATIONS_DIR, `${lastId}.up.sql`),
    downPath: path.join(MIGRATIONS_DIR, `${lastId}.down.sql`),
  };

  if (!fs.existsSync(migration.downPath)) {
    throw new Error(`Down migration missing: ${migration.downPath}`);
  }

  console.log(`  ↓ Reverting: ${migration.name}`);
  const sql = fs.readFileSync(migration.downPath, 'utf-8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('DELETE FROM public.schema_migrations WHERE id = $1', [migration.id]);
    await client.query('COMMIT');
    console.log('  ✓ Reverted 1 migration');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Failed: ${migration.name}`);
    throw error;
  }
}

// --- CLI ---
const command = process.argv[2];
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://workalaya:workalaya_dev@localhost:5432/workalaya';

const client = new Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  console.log(`Migration runner (${command})`);

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY.toString()]);

    if (command === 'up') {
      await up(client);
    } else if (command === 'down') {
      await down(client);
    } else {
      throw new Error('Usage: migrate.ts <up|down>');
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY.toString()]);
    } catch {
      // Best effort unlock; connection close also releases session-level locks.
    }
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
