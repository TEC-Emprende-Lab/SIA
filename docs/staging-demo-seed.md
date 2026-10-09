# Datos de demostración exclusivos de staging

Carga manual `sia-staging-demo-2026-10-v1`, solicitada para explorar la UI de
`https://sia.dev.neuroboard.app`. Todos los proyectos, equipos, conversaciones,
actividades y resultados son **ficticios**; los expedientes llevan `[DEMO]` y las
descripciones lo indican. No usar como datos de una convocatoria o informe real.

Trazabilidad: US-PRO-001 (objetivos, actividades y evidencias), US-PRO-004
(fuentes de informes), US-PRO-005 (seis áreas oficiales) y US-PRO-006 (ambiciones).
No introduce reglas de negocio ni criterios de salida.

## Contenido

- Bruma Agro: sensores y recomendaciones de riego para horticultura.
- Circular Café: bandejas de vivero hechas con residuos de café.
- Ruta Clara: trazabilidad de entregas de comercio local.
- Aula Viva: kit accesible de experiencias de ciencias para docentes.

Cuatro expedientes de Prototipado con un ciclo cada uno, 16 ambiciones (cuatro
sin objetivo asociado), 24 objetivos, 96 actividades, 36 referencias de evidencia,
12 diagnósticos descriptivos, 12 reuniones y minutas, 24 acuerdos propuestos,
12 canales, 72 mensajes sintéticos y ocho borradores de informe.

Las evidencias son **referencias internas al expediente demo**, con una bitácora
descriptiva; no son archivos adjuntos, ensayos certificados ni enlaces externos
inventados. Las reuniones no contienen enlaces de videollamada inexistentes.
No se cargan datos de menores, clientes reales ni documentos de producción.

Objetivos en borrador/pendientes, diagnósticos en borrador, minutas de origen
`ia_borrador` con transcripción sintética e informes en borrador. **No se crean
aprobaciones humanas ni PDF aprobados.** El avance agregado del ciclo sigue
siendo 0 % hasta validar objetivos; el avance por objetivo muestra las actividades
simuladas completadas. La comparación de diagnósticos aprobados necesita revisión
humana. Finanzas y compras siguen pendientes; no se inventan partidas ni facturas.

Puesta en marcha no se siembra: su alta está bloqueada por requisitos de entrada
`TBD`; la carga no evita esa restricción.

## Protección del destino

El comando exige simultáneamente:

- `SIA_ENVIRONMENT=staging`;
- origen exacto `https://sia.dev.neuroboard.app`;
- PostgreSQL host `n4oco8kccss0kssoc4s0ccs0`, base `sia_staging`;
- `current_database()` igual a `sia_staging`;
- operador Coordinadora **ya existente** y lectores Gestor/Emprendedor existentes.

No crea usuarios de Clerk, invitaciones ni credenciales; no modifica roles.
Solo asigna lectores indicados a los cuatro expedientes demo. Las Coordinadoras
ya tienen visibilidad global por la política existente.

No está conectado a startup, Dockerfile ni migraciones. No hay endpoint público.
Sin `--apply` hace comprobación de destino/usuarios y muestra un resumen sin escribir.

```sh
# Desde /app de la API STAGING; usar correos existentes, no contraseñas.
uv run --no-sync python -m app.domain.staging_demo \
  --origin https://sia.dev.neuroboard.app \
  --operator-email <coordinadora-existente> \
  --reader-email <emprendedor-existente> \
  --reader-email <gestor-de-prueba>

# Repetir con --apply únicamente después de revisar el destino del dry-run.
```

La transacción engloba toda la carga; un fallo revierte todos sus cambios. Un
bloqueo transaccional PostgreSQL serializa ejecuciones y UUID deterministas
impiden duplicados. Las filas existentes se conservan sin sobrescribir ediciones.
Una asignación demo revocada no se reactiva silenciosamente. No hay opción de
reset, eliminación ni truncado. El lote registra su procedencia en auditoría.

## Verificación

`tests/test_staging_demo.py` comprueba rechazo de producción/otros hosts y bases,
contenido y relaciones, fechas, seis áreas, ausencia de aprobaciones, repetición
sin duplicados, conservación de ediciones y revocaciones, y rollback atómico.

Tras cargar, comprobar desde la cuenta Emprendedor y las cuentas de prueba:
selector de proyectos, diagnóstico, ambiciones, objetivos/actividades, evidencias,
reuniones, canales e informes. Registrar resultado real de la carga separadamente;
la existencia del script por sí sola no demuestra que staging tenga datos.
