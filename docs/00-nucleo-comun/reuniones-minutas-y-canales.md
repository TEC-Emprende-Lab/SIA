# Reuniones, minutas y canales

## Reuniones

Las reuniones se realizan en herramientas externas, como Zoom o Google Meet. SIA registra fecha, participantes, enlace o referencia, minuta, acuerdos, responsables y proximos pasos.

No se prioriza almacenar grabaciones o videos de reuniones por su costo. La retencion o referencia excepcional de grabaciones esta `TBD`.

## Minutas

Una minuta puede redactarse manualmente o generarse como borrador desde una transcripcion disponible. Toda minuta generada con IA requiere revision humana de Gestor o Coordinadora antes de publicarse. La IA no inventa acuerdos, responsables ni fechas.

## Canales

**Decisión confirmada 2026-10-13 — US-COM-001:** cada emprendimiento tiene una
terna fija de canales compartidos: **Gestión de proyecto**, **Finanzas** y
**Reuniones**. Se crean automáticamente al consultar los canales del emprendimiento;
no se duplican ni se crean por ciclo. Los canales libres históricos se conservan para
no eliminar conversaciones previas, pero no se pueden crear canales nuevos fuera de
la terna.

Las reglas de participacion, menciones, adjuntos, no leidos y notificaciones se aplican por canal y se validan en backend. Los adjuntos son privados. Los mensajes editados o eliminados visualmente conservan auditoria de actor y fecha.

Los tres canales no introducen permisos particulares: mantienen las reglas de acceso
del emprendimiento. Los permisos diferenciados, adjuntos y cualquier ampliación futura
de la terna siguen `TBD`.

### US-COM-001 — Consultar los canales estándar del emprendimiento

Como participante autorizado de un emprendimiento, quiero encontrar los canales de
Gestión de proyecto, Finanzas y Reuniones para separar las conversaciones del equipo.

**Aceptación:** la API entrega una sola terna compartida por emprendimiento; no crea
canales por ciclo ni admite canales nuevos fuera de esa terna; el acceso se valida en
backend y los canales históricos no se eliminan.

### US-COM-002 — Referenciar trabajo del ciclo desde un mensaje

Como participante autorizado de un emprendimiento, quiero referenciar un objetivo o
actividad del ciclo que estoy consultando desde un mensaje para dar contexto al equipo
sin duplicar la conversación.

**Aceptación:** el selector presenta solo objetivos y actividades del ciclo actual; la
API valida en backend el acceso al canal, al ciclo y al recurso antes de guardar una
referencia; el mensaje y el detalle del objetivo o actividad muestran la relación. Las
referencias históricas conservan su ciclo original y los mensajes revocados no exponen
su contenido mediante esta consulta. Notificaciones nuevas, referencias a otros tipos
de recurso y tiempo real están `OUT OF SCOPE`.
