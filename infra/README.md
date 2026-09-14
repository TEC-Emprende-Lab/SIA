# Desarrollo local

Fase 0 levanta las dependencias de desarrollo y las aplicaciones vacías:

```bash
cp .env.example .env
docker-compose --file infra/docker-compose.yml up --build
```

- Web: `http://localhost:3000/api/health`
- API: `http://localhost:8000/healthz`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO: `http://localhost:9001`

No contiene datos semilla, autenticación ni migraciones todavía. La Fase 1 añade identidad y autorización; la Fase 2 añade la persistencia del núcleo común.
