# Activar Finanzas y Compras (013)

**No ejecutar la antigua revisión experimental 008 de Finanzas.** El repositorio ya
usa 008–012 para evidencias y canales. La migración definitiva de Finanzas es
[`013_finanzas.py`](../apps/api/alembic/versions/013_finanzas.py), sucesora de `012`.

No importa los proyectos SBD ni modifica sus datos. Crea seis tablas financieras,
índices, FK y triggers de alcance/no-borrado. No crea partidas ni presupuestos de
ejemplo: la Coordinadora los registra después.

## Opción recomendada — Alembic

1. Respaldar la base correcta y probar la restauración según el procedimiento del
   ambiente. Confirmar `SIA_DATABASE_URL` sin imprimir credenciales.
2. Usar el código o la imagen nueva que incluya `013` y el lockfile actualizado.
3. Ejecutar **una sola vez**, antes de habilitar tráfico de la API nueva.

Desde la raíz del repositorio, con uv y las variables del ambiente configuradas:

```bash
uv sync --directory apps/api --frozen --no-dev
uv run --directory apps/api --no-sync alembic current
uv run --directory apps/api --no-sync alembic upgrade head
uv run --directory apps/api --no-sync alembic current
uv run --directory apps/api --no-sync alembic check
```

En la **terminal de la imagen nueva de la API en Coolify**, la ruta es distinta:

```bash
sh /app/scripts/release.sh
```

El script existente aplica `upgrade head`, muestra la revisión y comprueba el
esquema. El resultado esperado es `013 (head)` y ninguna operación de upgrade
pendiente. No hace falta modificar el script ni migrar desde cada réplica.

Si la base está antes de 012, Alembic aplica también las revisiones previas que le
faltan. `012` se detiene si encuentra canales compartidos duplicados; no borres
conversaciones para saltarte esa protección ni uses `stamp` para ocultar el error.

## Alternativa — SQL manual (solo PostgreSQL en 012)

Archivo listo para ejecutar:
[`deploy/migrations/013_finanzas.sql`](../deploy/migrations/013_finanzas.sql).

Primero comprobar:

```sql
SELECT version_num FROM alembic_version;
```

Debe devolver **una sola fila `012`**. Si devuelve otra revisión, usa Alembic con
la cadena completa, no este SQL aislado. Ejecutar todo el archivo en una sesión,
no por fragmentos. Usa una transacción, verifica la revisión previa y actualiza
`alembic_version` a `013` únicamente al completar la creación. Una repetición se
rechaza, no sobrescribe tablas. No ejecutes ambas opciones para el mismo cambio.

## Después

- Configurar Redis (`SIA_REDIS_URL`): Finanzas falla cerrado con 503 si no está
  disponible. Los límites evitan mutaciones cuando se excede la frecuencia.
- Mantener R2/MinIO privado (`SIA_STORAGE_*`) para adjuntar y consultar respaldos.
- Reconstruir/reiniciar API, worker y Web con las imágenes nuevas. El backend
  incorpora `pypdf` para lectura asistida de PDF, sin OCR ni conversión de moneda.
- Comprobar `/readyz`, acceso real con los tres roles y aislamiento por ciclo.
- Registrar una partida aprobada como Coordinadora y realizar el recorrido de
  borrador/revisión/ejecución en staging antes del uso operativo.

No se aplicó esta migración a una base operativa durante el desarrollo. No hagas
`downgrade` después de registrar finanzas: eliminaría tablas históricas; cualquier
reversión requiere un procedimiento aprobado y respaldo verificado.
