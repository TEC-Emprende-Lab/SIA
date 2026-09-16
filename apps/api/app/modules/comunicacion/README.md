# Comunicación backend

Implementación API-first de reuniones, minutas, acuerdos, canales, mensajes,
menciones, lecturas y bandejas internas. Sin UI. Migración `004` después de `003`;
solo crea tablas, índices y triggers de comunicación. No modifica identidad,
seguridad ni las migraciones 001–003.

## Trazabilidad

| Fuente | Aceptación backend |
|---|---|
| US-PRO-004 / US-PM-003 | Minutas y acuerdos como fuentes persistentes del futuro informe; revisión humana, actor, fecha, observación y minuta aprobada inmutable. No implementa informes/PDF ni declara completas estas historias. |
| Núcleo: reuniones-minutas-y-canales | Fecha con zona horaria, participantes descriptivos (incluidos externos), referencia HTTP(S), minutas manuales y borradores desde transcripción; acuerdos con responsable autorizado, fecha y próximos pasos. |
| Núcleo: actores-roles-y-permisos | Coordinadora global; Gestor exacto crea reuniones, acuerdos y publica minutas; Emprendedor consulta minutas publicadas. Asignaciones revocadas o de otro rol no autorizan. |
| Núcleo: modelo-de-datos-compartido | FK, ámbito heredado y restricciones SQL; revocación visual sin borrar historia; auditoría transaccional. |
| Núcleo: notificaciones-y-alertas | Menciones autorizadas generan una alerta y notificación interna por destinatario; bandeja propia, lectura idempotente y revocación aplicada en cada petición. |

No existen historias específicas numeradas para chat en los documentos vigentes:
se usa la regla común como fuente, sin inventar identificadores funcionales.

## Contrato REST

- `GET/POST /cycles/{cycle_id}/meetings`; `GET/PUT/DELETE .../{meeting_id}`.
- `GET/POST .../{meeting_id}/minutes`; `POST .../minutes/drafts` recibe transcripción.
- `PUT .../minutes/{minutes_id}` y `POST .../minutes/{minutes_id}/approval`.
- `GET/POST .../{meeting_id}/agreements`; `PUT .../agreements/{agreement_id}`.
- `GET /channels?entrepreneurship_id=...&cycle_id=...`, `POST /channels`.
- `GET/POST /channels/{channel_id}/messages`, `PUT/DELETE .../messages/{message_id}`.
- `PUT /channels/{channel_id}/read-receipt`, `GET .../unread`.
- `GET /alerts`, `GET /notifications`, `PUT /notifications/{notification_id}/read`.

Los listados admiten `offset=0` y `limit=50` (máximo técnico 100), ordenados por
fecha e ID. No se devuelven objetos fuera del scope para completar una página.
Los errores usan `detail`: 401 sin autenticación; 403 ámbito/rol no autorizado;
404 recurso ajeno al padre autorizado; 409 revisión obsoleta, revocación o minuta
aprobada; 422 entrada inválida o destinatario sin acceso.

PUT de entidades editables y DELETE requieren `expected_revision` y `observation`.
PUT reemplaza sus campos editables. La aprobación requiere también
`human_reviewed: true`; el backend fija revisor y fecha. No se aceptan actor,
estado o aprobación enviados arbitrariamente por el cliente. Una corrección de
una minuta aprobada se registra como otra minuta, sin sobrescribir la anterior.

## Ámbito e historial

Reuniones heredan emprendimiento por `cycle -> enrollment`; minutas y acuerdos
heredan el ciclo de la reunión. Canales pertenecen al emprendimiento y,
opcionalmente, a un ciclo exacto. Los triggers verifican esa relación.
`expediente/policy.py` se reutiliza sin cambios.

Sin `cycle_id`, `/channels` consulta solo canales compartidos del emprendimiento:
exige asignación directa (o Coordinadora). El permiso de resumen de expediente
obtenido por un ciclo no abre comunicaciones compartidas ni ciclos hermanos.
No existen excepciones de permisos por tipo de canal mientras sigan TBD.
El alta operativa de canales usa Gestor del ámbito o Coordinadora; la participación
usa el acceso común documentado. La edición/revocación de mensaje está limitada
al autor; no se añaden permisos de moderación sobre mensajes ajenos.

Las menciones se fijan al crear el mensaje y no se interpretan desde texto `@...`.
Sus IDs deben tener acceso actual al canal. Una mención repetida en la misma
entrada produce una sola fila/alerta/notificación. Los mensajes revocados aparecen
como marcadores con `content: null`; su contenido anterior permanece en DB y
auditoría. Las reuniones revocadas conservan sus registros consultables y no
admiten nuevos acuerdos ni minutas.

Cada lectura pertenece al usuario autenticado y avanza sin retroceder. El FK
compuesto impide marcar leído un mensaje de otro canal. No leídos excluye mensajes
propios y revocados. Alertas y notificaciones filtran destinatario y asignaciones
vigentes antes de paginar; Coordinadora tampoco lee bandejas personales ajenas.

La migración protege en PostgreSQL y SQLite las minutas aprobadas, referencias
de propiedad, fuente de transcripción y borrado físico de todas estas tablas.
Las mutaciones y auditoría se confirman juntas. PostgreSQL serializa cambios de
reunión/minuta/acuerdo por ciclo y mensajes/lecturas por canal; revisión optimista
rechaza ediciones concurrentes obsoletas. Las migraciones, no `create_all`, instalan
los triggers. El downgrade es solo para bases desechables: elimina esas tablas.

## Interfaces y TBD

`MinutesGenerator` admite un proveedor de borradores desde una transcripción
seleccionada. El adaptador actual es `TranscriptDraftStub`: conserva literalmente
la fuente y añade `Pendiente de completar — borrador sin procesamiento IA`.
**No llama a un modelo ni extrae acuerdos**. El origen `ia_borrador` representa
el flujo asistido pendiente y siempre necesita revisión humana. La integración
real de proveedor/worker pertenece al trabajo pendiente de IA.

`CommunicationIntegrations` y `UnconfiguredIntegrations` exponen interfaces y
stubs que fallan explícitamente: taxonomía/permisos particulares de canales,
adjuntos privados/MIME/tamaño, grabaciones Zoom/Meet, plantilla de informe,
Resend y Socket.IO/Redis. No hay categorías predefinidas, siembra de canales, subida de archivos ni
entrega simulada de correo/tiempo real.

`emit_alert` es una entrada interna transaccional para eventos autorizados,
idempotente por `source_key`; actualmente la invoca el flujo de menciones.
Los futuros módulos pueden emitir sus eventos sin un endpoint público para
crear alertas arbitrarias. Periodicidad, escalamiento y cierre siguen TBD;
no hay programador ni endpoint de resolución. Los estados de acuerdos y la
entidad independiente `MeetingAction` siguen sin definición: próximos pasos
son texto del acuerdo, sin automatizar actividades.

## Verificación

`tests/test_comunicacion.py` monta `create_app`, ejecuta upgrade/downgrade real
001–004, habilita FK SQLite y cubre ambos programas, scope, revocaciones,
publicación humana, SQL inmutable, auditoría, rollback, menciones, lecturas,
bandejas y contratos. `COMUNICACION_TEST_DATABASE_URL` activa PostgreSQL
desechable y la carrera aprobación/edición. Nunca usar una base con datos.
CI ejecuta esta variable junto con las tres existentes, secuencialmente.
