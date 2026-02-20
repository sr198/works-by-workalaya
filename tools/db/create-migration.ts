import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, 'migrations');

function toUtcTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function usage(): never {
  console.error('Usage: pnpm db:migrate:create -- <description>');
  console.error('Example: pnpm db:migrate:create -- create_users_table');
  process.exit(1);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main(): void {
  const rawDescription = process.argv.slice(2).join(' ').trim();
  if (!rawDescription) usage();

  const slug = slugify(rawDescription);
  if (!slug) {
    console.error('Description must contain letters or numbers.');
    usage();
  }

  ensureDir(MIGRATIONS_DIR);

  const id = `${toUtcTimestamp(new Date())}_${slug}`;
  const upFile = path.join(MIGRATIONS_DIR, `${id}.up.sql`);
  const downFile = path.join(MIGRATIONS_DIR, `${id}.down.sql`);

  if (fs.existsSync(upFile) || fs.existsSync(downFile)) {
    throw new Error(`Migration already exists for id ${id}. Wait one second and retry.`);
  }

  const upTemplate = `-- Migration: ${id}
-- Direction: up
-- Write forward schema/data changes here.

BEGIN;

-- Example:
-- CREATE TABLE IF NOT EXISTS public.example (
--   id UUID PRIMARY KEY
-- );

COMMIT;
`;

  const downTemplate = `-- Migration: ${id}
-- Direction: down
-- Revert changes from the paired .up.sql file.

BEGIN;

-- Example:
-- DROP TABLE IF EXISTS public.example;

COMMIT;
`;

  fs.writeFileSync(upFile, upTemplate, 'utf-8');
  fs.writeFileSync(downFile, downTemplate, 'utf-8');

  console.log('Created migration files:');
  console.log(`  ${path.relative(process.cwd(), upFile)}`);
  console.log(`  ${path.relative(process.cwd(), downFile)}`);
}

main();
