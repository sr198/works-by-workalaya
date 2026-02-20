# Observability

## Metrics

The API exposes a Prometheus-compatible metrics endpoint at `GET /metricz`.

### Available metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency |
| `http_requests_total` | Counter | method, route, status_code | Total request count |
| `nodejs_*` | Various | — | Node.js process metrics (heap, GC, event loop) |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `true` | Enable/disable the `/metricz` endpoint |
| `METRICS_TOKEN` | — | Bearer token to protect the endpoint. If unset, no auth required |

In production, always set `METRICS_TOKEN` to a strong random string and configure Prometheus with:

```yaml
bearer_token: 'your-metrics-token-here'
```

### Grafana dashboard

The `api-overview` dashboard ships in `tools/docker/grafana/dashboards/api-overview.json` and includes:
- **Requests / sec** — by route
- **Error Rate** — 4xx + 5xx by route
- **p95 Latency** — per route

## Local Observability Stack

Prometheus and Grafana run as a Docker Compose profile. They are opt-in so the default `docker compose up` doesn't start them.

```bash
# Start everything including observability
docker compose --profile observability up -d

# Prometheus UI
open http://localhost:9090

# Grafana UI (admin / admin)
open http://localhost:3001
```

> Prometheus is configured to scrape `host.docker.internal:3000/metricz`. Start the API locally (`pnpm nx serve api`) before Prometheus tries to collect.

### Config files

| File | Purpose |
|------|---------|
| `tools/docker/prometheus.yml` | Prometheus scrape config |
| `tools/docker/grafana/provisioning/datasources/prometheus.yml` | Auto-provisions Prometheus datasource |
| `tools/docker/grafana/provisioning/dashboards/provider.yml` | Auto-loads dashboards from disk |
| `tools/docker/grafana/dashboards/api-overview.json` | API overview dashboard |

## Logging

Structured JSON logging via **Pino**. In development, `pino-pretty` formats logs for readability.

Every request log includes:
- `correlationId` — from `X-Correlation-Id` header (auto-generated UUID if absent)
- `method`, `url`, `statusCode`, `responseTimeMs`
- `userId` — from JWT payload when authenticated

Log level is controlled by `LOG_LEVEL` env var (default: `info`).
