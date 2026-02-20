# Database Migrations

## Overview

Migrations live in `tools/db/migrations` and are applied by `tools/db/migrate.ts`.

The migration runner enforces:

- up filename format: `YYYYMMDDHHmmss_description.up.sql`
- paired down file exists: `YYYYMMDDHHmmss_description.down.sql`
- only unapplied migrations run on `up`
- `down` reverts the most recently applied migration from DB history
- advisory lock prevents concurrent migration runners

## Create a Migration

Use the generator script:

```bash
pnpm db:migrate:create -- create_users_table
```

This creates:

- `tools/db/migrations/<timestamp>_create_users_table.up.sql`
- `tools/db/migrations/<timestamp>_create_users_table.down.sql`

The timestamp is UTC (`YYYYMMDDHHmmss`) so IDs remain lexicographically sortable.

## Apply Migrations

```bash
pnpm db:migrate:up
```

Behavior:

- checks `public.schema_migrations`
- runs missing `.up.sql` files in sorted order
- inserts migration ID after successful apply

## Revert Last Migration

```bash
pnpm db:migrate:down
```

Behavior:

- reads latest applied migration ID from `public.schema_migrations`
- executes matching `.down.sql`
- removes that migration ID from `public.schema_migrations`

## Authoring Guidelines

- Keep each migration small and focused.
- Always write a real rollback in `.down.sql`.
- Avoid non-transactional DDL when possible.
- Never edit an already-applied migration; create a new migration instead.
