# CI/CD Pipeline

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR → `main` | PR gate: lint, test, build, security audit |
| `cd-staging.yml` | Push to `main` | Build + push Docker images; deploy to staging |
| `cd-production.yml` | Manual dispatch | Blue-green deploy to production |

## PR Gate (`ci.yml`)

Four parallel jobs:

1. **lint** — `pnpm nx affected -t lint`
2. **test** — `pnpm nx affected -t test --coverage`; runs with real Postgres (PostGIS 16) and Redis 7 as GitHub Actions services
3. **build** — `pnpm nx affected -t build`
4. **security** — `pnpm audit --audit-level=high`

Affected detection uses `nrwl/nx-set-shas@v4` — only projects touched by the PR are linted/tested/built.

## Docker Images

Two images are produced:

| Image | Dockerfile | Build target |
|-------|-----------|--------------|
| `api` | `apps/api/Dockerfile` | `dist/apps/api/main.js` |
| `worker` | `apps/worker/Dockerfile` | `dist/apps/worker/main.js` |

Both use a 4-stage multi-stage build (`base → deps → build → prod`) and run as non-root user `nodeuser` (uid 1001).

Images are tagged: `sha-<short-sha>` and `latest`.

```bash
# Build locally for testing
docker build -f apps/api/Dockerfile -t workalaya-api:local .
docker build -f apps/worker/Dockerfile -t workalaya-worker:local .
```

## Staging Deploy (`cd-staging.yml`)

Triggers automatically on every merge to `main`. Builds and pushes images to GHCR, then runs a deploy step.

> **Status**: deploy step is scaffolded with TODO. Fill in once staging server is provisioned (SSH, kubectl, Fly.io, etc.).

## Production Blue-Green Deploy (`cd-production.yml`)

Manual `workflow_dispatch` — requires specifying the `image_tag` to deploy (e.g. `sha-abc1234`).

### Blue-green strategy

`tools/docker/docker-compose.prod.yml` defines both `api-blue` and `api-green` services behind an nginx reverse proxy.

`tools/docker/nginx.conf` upstream:

```nginx
upstream api_backend {
    server api-blue:3000;
    # server api-green:3000;
}
```

**Swap procedure**:
1. Start standby colour with new image, wait for `/health` to return 200
2. Edit `nginx.conf`: comment active colour, uncomment standby
3. `docker compose exec nginx nginx -s reload` — zero-downtime cutover
4. Wait 30s for in-flight requests to drain, then stop old colour

> **Status**: deploy steps are scaffolded with TODO. Full implementation deferred until production server is provisioned.

## Required Secrets

| Secret | Workflow | Description |
|--------|----------|-------------|
| `GITHUB_TOKEN` | cd-staging | Auto-provided by GitHub Actions for GHCR push |
| _(staging secrets)_ | cd-staging | SSH key / deploy token once infra is provisioned |
| _(production secrets)_ | cd-production | Server access credentials |

## Production Docker Compose

`tools/docker/docker-compose.prod.yml` — does **not** include Postgres, Kafka, or Redis (managed services in production). Configure via environment variables:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
KAFKA_BROKERS=broker1:9092,broker2:9092
JWT_SECRET=...
METRICS_TOKEN=...
API_IMAGE=ghcr.io/your-org/workalaya/api:sha-abc1234
WORKER_IMAGE=ghcr.io/your-org/workalaya/worker:sha-abc1234
```
