#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Works by Workalaya — Local Dev Setup ==="

# 1. Copy env if missing
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
  echo "✓ Created .env from .env.example"
else
  echo "• .env already exists, skipping"
fi

# 2. Install dependencies
echo "→ Installing dependencies..."
pnpm install

# 3. Start Docker services
echo "→ Starting Docker services..."
docker compose -f "$PROJECT_ROOT/tools/docker/docker-compose.yml" up -d

# 4. Wait for services to be healthy
echo "→ Waiting for services..."

wait_for_service() {
  local name=$1
  local check=$2
  local retries=30
  local count=0
  while ! eval "$check" > /dev/null 2>&1; do
    count=$((count + 1))
    if [ $count -ge $retries ]; then
      echo "✗ $name failed to start after $retries attempts"
      exit 1
    fi
    sleep 1
  done
  echo "✓ $name is ready"
}

wait_for_service "PostgreSQL" "docker exec workalaya-postgres pg_isready -U workalaya"
wait_for_service "Redis" "docker exec workalaya-redis redis-cli ping"
wait_for_service "Kafka" "docker exec workalaya-kafka kafka-topics --bootstrap-server localhost:9092 --list"

# 5. Run migrations (when available)
# echo "→ Running migrations..."
# pnpm db:migrate:up

echo ""
echo "=== Setup complete ==="
echo "  PostgreSQL: localhost:5432 (workalaya/workalaya_dev)"
echo "  Kafka:      localhost:9092"
echo "  Redis:      localhost:6379"
echo ""
echo "Run 'pnpm nx serve api' to start the API server"
