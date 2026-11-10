# Release de la migración 013 en staging

Registro resumido de la aplicación de Finanzas en staging. **No certifica producción ni
la validación funcional por roles.** La evidencia original proviene de la rama
`fix/alembic-012-013-readiness` (commits `155d503` y `aaf48f4`), que no está fusionada
en `main`; se conserva aquí para no perder trazabilidad.

## Alcance

- Fecha registrada: 2026-10-30.
- Entorno: staging (`https://sia.dev.neuroboard.app`).
- Migración aplicada: `013`, sucesora de `012`; añade tablas, índices, claves y
  disparadores de Finanzas sin modificar tablas anteriores.
- Cabeza esperada y verificada: `013 (head)`.
- Producción no se modificó en esta operación.

## Evidencia registrada

- Se creó y restauró un respaldo previo a la migración.
- La migración se aplicó con la imagen del commit
  `3f6243dbc558d6093d2001ae686fc516447d0f14`.
- La API se desplegó después con el digest
  `sha256:6f0e577aece2b02243380e8d9beaec3665261ffe8f9ca652de41352c49be70bb`.
- `alembic current` y `alembic heads` devolvieron `013 (head)`.
- `alembic check` no detectó operaciones pendientes.
- La Web pudo consultar `/readyz`.
- El endpoint de Finanzas rechazó una petición sin sesión.
- El puente `155d503` se ensayó con bases restauradas en `012` y `013` antes del
  despliegue.

## Límites

- No se recorrieron los roles autenticados de Coordinadora, Gestor y Emprendedor.
- Las imágenes usadas estaban en un registro local de loopback sin autenticación; no es
  un registro apto para producción.
- La firma de la evidencia de construcción fue local, no una atestación independiente
  de CI.
- El respaldo y su clave estaban en el mismo servidor; falta custodia externa y
  separación de claves.
- Un `downgrade` después de registrar Finanzas destruiría tablas históricas; la
  reversión requiere un procedimiento aprobado y respaldo verificado.
- Producción requiere su propio plan, migración, validaciones y aprobación explícita.

## Siguiente verificación

1. Confirmar en staging `alembic current` = `013 (head)`, `alembic check` sin
   diferencias y el SHA o digest realmente servido.
2. Revisar los request logs y `/readyz` después del despliegue.
3. Recorrer Finanzas y los módulos existentes con los tres roles, sin usar datos de
   producción.
4. Documentar backups, restauración y rollback con evidencia independiente.

Ver también [finanzas-migracion](finanzas-migracion.md),
[finanzas-verificacion](finanzas-verificacion.md) y
[operación de la API](operacion-api.md#migraciones-y-despliegue-stagingproducción).
