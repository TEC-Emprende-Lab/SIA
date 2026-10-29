# Finanzas y compras de Prototipado

US-PRO-003/004/007–010. Decisiones y límites:
[finanzas-operacion.md](../../../../../docs/02-prototipado/finanzas-operacion.md).
Réplica funcional adaptada, no conexión ni importación del sistema anterior.

## Operación

1. Aplicar Alembic `013` después de `012`. No ejecutar seeds/scripts SBD.
2. Configurar PostgreSQL, Redis (`SIA_REDIS_URL`) y almacenamiento privado
   (`SIA_STORAGE_*`). Sin Redis las rutas financieras responden 503, sin ejecutar.
   Sin R2/MinIO no se puede subir respaldo; no se degrada a archivo público.
3. Coordinadora registra partidas aprobadas con nombre, monto CRC y referencia.
4. Emprendedor/Gestor/Coordinadora crean borrador; adjuntan respaldo privado,
   completan checklist y envían. Emprendedor no edita borradores ajenos.
5. Gestor/Coordinadora pide corrección o valida con revisión humana; luego registra
   consecutivo FUNDATEC. Coordinadora confirma fecha de ejecución o anula antes de
   ejecutar. Comisiones no requieren pasar por OC/FUNDATEC.
6. Gestor/Coordinadora solicita traslado; Coordinadora aprueba/rechaza. Los saldos
   cambian en una sola transacción con auditoría.

No hay alta de presupuesto/catálogo ficticio ni importación histórica. Se usa un
agregado de partidas por ciclo (no tabla `budgets` vacía duplicando el ciclo).
Factura es referencia/respaldo del mismo trámite, no una segunda fila de gasto.

## API

Prefijo `/cycles/{cycle_id}/finanzas`:

- `GET /definitions`, `/summary`: cinco tipos, checklist v1 y ejecución por partida.
- `POST /items`: partida aprobada, solo Coordinadora.
- `GET/POST /purchases`, `GET/PUT /purchases/{id}`: listado paginado/filtrado y borradores.
- `POST /purchases/{id}/transitions`: comando explícito, no estado arbitrario.
- `GET/POST /purchases/{id}/attachments`: referencia a `documents` del mismo emprendimiento.
- `GET /events?entity_id=...`: historial paginado con actor, fecha, motivo y snapshot.
- `GET/POST /changes`, `POST /changes/{id}/decision`: traslados revisados.
- `GET /duplicates`: proveedor+monto como advertencia; exacto proveedor+documento
  bloqueado al crear/editar/enviar, excepto rechazados/anulados.
- `POST /extract`: XML/PDF en base64, límite técnico de extracción 6 MB;
  XML UTF-8 sin DTD/entidades, PDF textual primeras seis páginas, sin OCR.
  CRC no confirmada → no aplicar monto. Nunca inferir modalidad de reintegro.
- `GET/POST /reconciliations`: parser pasivo de exportación HTML (`.xls`), límite
  técnico 2 MB; hash y resultado bilateral inmutables. No interpreta macros/XLS binario.
- `POST /reconciliations/{id}/resolutions`: comentario auditado por fila, sin corregir
  automáticamente trámites. Resoluciones adicionales conservan las anteriores.
- `GET /report.pdf`: exportación operativa por fecha de registro/tipo/estado.
- `GET /report-text`: texto copiable de validaciones por fecha de evento, no de pago.

`GET /finanzas/overview` y `/finanzas/report.pdf`: cartera de Prototipado autorizada,
sin ciclos hermanos ni asignaciones revocadas. La Web usa el BFF con JWT Clerk;
preserva bytes PDF. No hay cliente Supabase ni conexión externa en este módulo.

Todos los listados operativos soportan offset/limit (50, máximo 100), excepto
agregados, duplicados y exportaciones, que abarcan el conjunto autorizado completo.
Dinero Decimal/Numeric(14,2); snapshots guardan montos como texto exacto. Campos
de actor, alcance, aprobación y estado no se aceptan de formularios editables.

## Integridad

- Autorización por ciclo exacto/relación vigente, programa habilitado y rol.
- Bloqueo de fila del ciclo y expected_revision para serializar escrituras; clave
  idempotente por creación de trámite. Reintento con otros datos devuelve 409.
- FK compuestas partida/trámite/traslado mantienen ciclo y emprendimiento.
- Triggers SQL (PostgreSQL y SQLite) protegen alcance de partidas/adjuntos,
  propiedad, no-borrado, finales, eventos y conciliaciones. Eventos ORM complementan.
- Entidad, historial, auditoría y alertas por envío/corrección/rechazo/ejecución en
  la misma transacción. Destinatarios autorizados; no hay correo/escalamiento nuevo.
- Informe técnico incorpora solo ejecuciones del período con id/revisión/partida/
  documento; al aprobar captura fuentes inmutables, sin tocar informes anteriores.
- Reportes operativos NO afirman aprobación institucional ni cambian informes.

## Pruebas y límites

`tests/test_finanzas.py` ejecuta migraciones 001–013 en una base **desechable**, prueba
cinco tipos, permisos, alcance, revocación, idempotencia, checklist, errores de
revisión, no-borrado, adjuntos ajenos, rollback, traslados, conciliación, extracción,
PDF, cartera, informes y rate limiting. `FINANZAS_TEST_DATABASE_URL` activa PostgreSQL
y la carrera de escrituras. NUNCA apuntar estas pruebas a una base con datos.

Persisten TBD: catálogo oficial de partidas, reserva/comprometido/disponible
operativo, umbrales de alerta presupuestaria, permisos adicionales de Gestor,
límites globales de adjuntos y API FUNDATEC. No se implementan supuestos. Una
ejecución registrada no puede borrarse ni editarse; reversión de pagos ejecutados
requiere definir un flujo compensatorio antes de habilitarlo.

Réplica consciente: eliminación permanente, movimiento entre proyectos,
autenticación Supabase, scripts SQL de corrección de Ronda 3 y extensión Chrome no
se copian. [Viabilidad API FUNDATEC](../../../../../docs/fundatec-integracion.md).
