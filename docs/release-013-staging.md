# Release de la migración 013 en staging

Registro resumido de la aplicación de Finanzas en staging. **No certifica producción ni
la validación funcional por roles.** La [evidencia original][archivo] se conserva en
la etiqueta `archive/alembic-012-013-readiness` (commits `155d503` y `aaf48f4`).
El puente `012/013` fue temporal: no incorporarlo a la API que requiere `013`.

[archivo]: https://github.com/TEC-Emprende-Lab/SIA/blob/aaf48f4bb973251f5aa72f02667b6689cec510d5/docs/release-inmutable-013.md

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

## Verificar la imagen y la recuperación en próximos despliegues

Esta lista recupera criterios del ensayo original; no confirma que el proceso ya esté
automatizado ni autoriza un despliegue.

1. **Identificar la imagen.** Registrar el commit aprobado, la plataforma y el digest
   del manifiesto OCI. Para una imagen multiplataforma, registrar también el manifiesto
   de la plataforma elegida. Verificar la procedencia firmada del constructor de CI;
   una etiqueta con el SHA de Git no demuestra qué se construyó.
2. **Ensayar la recuperación.** Confirmar la base de destino y evitar migraciones
   concurrentes. Verificar la restauración en un entorno aislado y guardar el
   respaldo fuera del servidor con la clave bajo custodia separada. Conservar
   la imagen anterior y comprobar su compatibilidad con el esquema antes de
   considerarla una opción de reversión.
3. **Promover el mismo artefacto.** Si el despliegue incluye una migración, usar la
   misma imagen por digest y plataforma para migrar y servir la API. Registrar el
   ID de despliegue y comprobar que el ID de imagen del contenedor coincide con el
   digest de configuración OCI del manifiesto seleccionado, no con el digest del
   manifiesto. Validar la revisión de Alembic y `/readyz` antes de publicar la Web.

Ver también [finanzas-migracion](finanzas-migracion.md),
[finanzas-verificacion](finanzas-verificacion.md) y
[operación de la API](operacion-api.md#migraciones-y-despliegue-stagingproducción).
