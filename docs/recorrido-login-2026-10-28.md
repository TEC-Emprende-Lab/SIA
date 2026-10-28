# Login y recorrido funcional — 2026-10-28

## Alcance de esta comprobación

Recorrido real con Chrome y la extensión Playwright. Cuenta indicada por el usuario:
`tecemprendelab@gmail.com`. Rol devuelto por FastAPI: **Coordinadora**.
No se modificaron código, reglas, permisos ni configuración de autenticación.

Trazabilidad: acceso e invitaciones de
[actores, roles y permisos](00-nucleo-comun/actores-roles-y-permisos.md),
US-PRO-001 (objetivo, actividad, evidencia y cronograma), US-PRO-004 / US-PM-003
(reuniones e informes) y US-COM-001 (canales compartidos).
Las observaciones visuales adicionales no acreditan la aceptación completa de esas historias.

## Login comprobado

- Staging: `https://sia.dev.neuroboard.app`. Flujo Google → Clerk → SIA completado;
  `GET /api/sia/me` respondió **200**, correo indicado y rol Coordinadora.
- Producción: `https://sia.neuroboard.app`. Selección de la misma cuenta de Google,
  retorno a SIA y `GET /api/sia/me` **200**, con el mismo correo y rol.
- La cuenta anterior, `jokemtech@gmail.com`, tenía sesión válida de Clerk pero SIA
  devolvía **403**, `Se requiere invitación vigente`, en ambos entornos. Se cambió a
  la cuenta invitada; no se concedieron permisos a la cuenta anterior.
- Staging usa `bright-lobster-8405.clerk.accounts.dev` y conserva el aviso de claves
  Development. Producción consulta `clerk.neuroboard.app`. No se certifica con esto
  la publicación administrativa del proveedor OAuth ni todos los métodos de acceso.

## Datos de prueba autorizados en staging

Antes de la prueba, el listado de emprendimientos respondió **200 con `[]`** y el
selector de proyectos no ofreció registros. El usuario autorizó crear un proyecto QA.
El alta inicial se realizó mediante el BFF con la sesión real de Coordinadora porque
la pantalla inicial no ofrecía una acción visible de alta. **No se acredita el alta
del expediente a través de un formulario visible.**

- Emprendimiento: **QA Staging · Recorrido login 2026-10-28**,
  `762d8982-4165-4902-8620-c7196f0d4919`.
- Inscripción Prototipado: `9e38e254-d024-4bb5-b984-b399029e0263`.
- Ciclo: **Ciclo QA · Prueba funcional**, `360bd390-ce8b-44cc-af9e-4033e57ce44c`.
- Las tres altas respondieron **201**. Los datos quedan conservados como prueba;
  no se eliminaron registros históricos ni se cargaron proyectos en producción.

[Abrir el Resumen del proyecto QA](https://sia.dev.neuroboard.app/?project=360bd390-ce8b-44cc-af9e-4033e57ce44c#Resumen).

## Recorrido y resultados

- **Objetivos y actividades:** se creó desde el formulario el objetivo
  «QA · Validar recorrido del sistema», área Producto mínimo viable, y la actividad
  «QA · Comprobar persistencia de actividad», del 28 al 30 de octubre de 2026.
  Las consultas posteriores devolvieron un objetivo en borrador y una actividad pendiente.
  El cronograma devolvió esa actividad con las mismas fechas, sin duplicación.
- **Evidencias:** se registró desde la interfaz «QA · Evidencia de recorrido de staging»,
  enlace a `https://example.org/`, relacionado con la actividad de prueba. Se comprobó
  su persistencia por GET; no se cargó un archivo privado ni se probó su descarga.
- **Reuniones:** se registró desde el formulario «QA · Reunión de prueba del sistema»,
  30 de octubre a las 10:00 de Costa Rica. API: `2026-10-30T16:00:00Z`.
  Participante descriptivo: «Coordinación QA (prueba)»; referencia de prueba:
  `https://example.org/reunion-qa`. Se vio la reunión en listado y Resumen.
- **Chat:** se vieron Gestión de proyecto, Finanzas y Reuniones. Dos consultas
  consecutivas devolvieron la misma terna y los mismos IDs; esto comprueba reutilización
  secuencial, no concurrencia remota. Se envió desde la interfaz un mensaje explícitamente
  QA en Gestión de proyecto y se volvió a consultar por GET, conservado en el canal.
- **Resumen después de recargar:** mostró objetivo en Borrador, actividad pendiente,
  reunión próxima y avance de 0 %. No hubo aprobación de objetivo ni finalización de
  actividad. Acuerdos, alertas e historial de validaciones permanecieron vacíos.
- **Diagnóstico, Ambiciones, Evolución e Informes:** se visitaron los estados sin datos.
  No se crearon ni aprobaron diagnósticos o informes. Evolución indicó que requiere dos
  diagnósticos aprobados; Finanzas informó que su backend y reglas siguen pendientes.
- **Equipo:** indicó que solo presenta asignaciones realizadas durante la visita y que
  no había Gestores ni Emprendedores con sesión iniciada para asignar. No se asignaron roles.

Las operaciones de formularios se comprobaron con campos reales y acciones de la interfaz;
algunas activaciones se hicieron mediante DOM o teclado por esperas de estabilidad de
Playwright. **No se certifica con ello el comportamiento de todos los clics o el arrastre.**

En el Resumen se midió ancho de documento no superior al viewport a 390 y 1440 px.
No equivale a una revisión completa de móvil ni de accesibilidad. La consola de staging
después de recargar mostró cero errores y el aviso esperado de Clerk Development.
El SHA servido no fue identificado por un endpoint de versión en este recorrido.

## Límites y seguimiento

- No se recorrieron Gestor ni Emprendedor ni se acreditó aislamiento entre cuentas.
- Pendientes: arrastre Kanban, validaciones, referencias desde chat, carpetas/movimiento
  de evidencias, archivo privado, minutas/acuerdos, diagnósticos e informes/PDF.
- No se probaron backups, restauración, rollback ni la revisión Alembic directamente.
- En producción se comprobó exclusivamente el login y rol; no se crearon datos QA allí.
- Este recorrido no cierra Fase 8, Fase 9 ni el MVP completo.
- Mejora solicitada: [pantallas vacías](mejora-pantallas-vacias.md).
