#!/usr/bin/env bash
# US-PRO-004 / US-PM-003: packaging y arranque real del consumidor PDF.
# Solo usa PostgreSQL desechable; no lee .env ni conecta servicios del usuario.
set -euo pipefail

cd "$(dirname "$0")/.."
prefix="sia-worker-ci-$$"
image="$prefix:check"
database_url="postgresql+asyncpg://sia:test-only@$prefix-db:5432/sia_test"

cleanup() {
  docker logs "$prefix-worker" 2>&1 || true
  docker rm -f "$prefix-worker" "$prefix-db" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -f apps/worker/Dockerfile -t "$image" .
docker network create "$prefix" >/dev/null
docker run -d --name "$prefix-db" --network "$prefix" \
  -e POSTGRES_USER=sia -e POSTGRES_PASSWORD=test-only -e POSTGRES_DB=sia_test \
  postgres:16 >/dev/null
ready=false
for attempt in {1..30}; do
  if docker exec "$prefix-db" sh -c \
    'test "$(cat /proc/1/comm)" = postgres && pg_isready -U sia -d sia_test' \
    >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then
  docker logs "$prefix-db"
  exit 1
fi

# El worker incluye las migraciones, pero no debe ejecutarlas al arrancar.
docker run --rm --network "$prefix" \
  -e SIA_ENVIRONMENT=test -e SIA_DATABASE_URL="$database_url" \
  "$image" uv run --no-sync alembic upgrade head
docker run --rm --network "$prefix" \
  -e SIA_ENVIRONMENT=test -e SIA_DATABASE_URL="$database_url" \
  "$image" uv run --no-sync alembic check
docker run -d --name "$prefix-worker" --network "$prefix" \
  -e SIA_ENVIRONMENT=test -e SIA_DATABASE_URL="$database_url" \
  "$image" >/dev/null

# Deja pasar al menos dos consultas de la cola vacía por el CMD de producción.
sleep 12
test "$(docker inspect --format '{{.State.Running}}' "$prefix-worker")" = true
logs=$(docker logs "$prefix-worker" 2>&1)
if ! grep -Fq '"event":"worker.started"' <<< "$logs"; then
  echo 'El worker no confirmó su arranque.' >&2
  exit 1
fi
if grep -Eq 'worker cycle failed|Traceback' <<< "$logs"; then
  echo 'El worker falló al consultar la cola migrada.' >&2
  exit 1
fi
echo 'Worker: imagen construida, esquema verificado y consumidor activo con cola vacía.'
