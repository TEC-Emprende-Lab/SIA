# Modelo de datos compartido

Este modelo conceptual define entidades comunes y no prescribe un motor adicional a PostgreSQL.

## Identidad y expediente

- `User`: identidad SIA, rol y `clerk_user_id`.
- `Invitation`: correo, rol, token, emisor, vencimiento y uso.
- `Entrepreneurship`: expediente unico del emprendimiento.
- `ProgramEnrollment`: participacion historica en un programa.
- `ProgramCycle`: ciclo o proyecto especifico de una inscripcion.
- Relaciones N:M para gestores y emprendedores autorizados.

## Seguimiento

- `ProgramCanvas`, `CanvasArea` y `Deliverable`: definiciones versionadas por programa.
- `Ambition`: aspiracion visible del emprendimiento; puede no tener objetivos asociados.
- `Objective`, `Activity` y `Evidence`: plan de trabajo, ejecucion y respaldo. Cada objetivo pertenece a un area del canvas aplicable y puede vincular una ambicion de forma opcional.
- `ScheduleItem`: actividad o hito visible en cronograma.
- `Validation`: actor, decision, fecha, observacion y entidad validada.
- `EvolutionSnapshot`: momento o version comparable segun reglas del programa.

## Comunicacion y alertas

- `Meeting`, `MeetingMinutes`, `Agreement` y `MeetingAction`.
- `Channel`, `ChannelMessage`, `ChatAttachment`, `ChatMention` y `ChatReadReceipt`.
- `Alert` y `Notification`.

## Finanzas e informes

Las entidades financieras comunes se especifican en los programas que las habilitan: presupuesto, partida, compra, factura, documento y cambio presupuestario. Las entidades de informe son `TechnicalReport`, `TechnicalReportVersion`, `TechnicalReportSourceReference`, `TechnicalReportManualEntry` y `TechnicalReportDocument`.

## Auditoria

`AuditLog` conserva actor, entidad, accion, datos anteriores, datos posteriores y fecha. Registra al menos aprobaciones, modificaciones de objetivos aprobados, movimientos presupuestarios, validaciones, cierres, mensajes editados o eliminados y emision de informes.

Los campos completos, restricciones y transiciones de cada entidad se definen en el documento funcional del programa correspondiente. Ninguna relacion puede conectar registros de emprendimientos distintos.
