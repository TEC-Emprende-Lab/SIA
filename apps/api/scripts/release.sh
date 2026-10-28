#!/bin/sh
# Un solo paso de release para la imagen de la API.
# Coolify debe ejecutarlo una vez, con la imagen nueva y SIA_DATABASE_URL,
# antes de habilitar tráfico. No es el arranque de cada réplica.
set -eu
cd /app
uv run --no-sync alembic upgrade head
uv run --no-sync alembic current
uv run --no-sync alembic check
