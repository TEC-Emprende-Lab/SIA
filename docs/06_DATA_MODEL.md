# Modelo de datos conceptual

Este archivo define entidades de dominio. No prescribe todavía un motor de base de datos.

## User

Campos iniciales:

- `id`
- `name`
- `email`
- `role`
- `clerk_user_id`
- `created_at`
- `updated_at`

En el MVP, Clerk gestiona la identidad y Google es el proveedor de inicio de sesión. `clerk_user_id` vincula el usuario de SIA con la identidad externa. No existe contraseña local.

---

## Invitation

- `id`
- `email`
- `role`
- `project_id`
- `token_hash`
- `created_by`
- `expires_at`
- `used_at`
- `created_at`

Una invitación se asocia a un correo y rol inicial. `project_id` es obligatorio para invitaciones de emprendedores creadas por un Gestor. Solo puede utilizarse una vez y FastAPI debe validarla contra el correo verificado de la identidad Clerk autenticada.

---

## Project

- `id`
- `name`
- `status`
- `incubation_model`
- `created_at`
- `updated_at`

Campos adicionales: `TBD`.

### Relaciones

- N:M con `User` como gestores.
- N:M con emprendedores.
- 1:N con `Objective`.
- 1:N con `Meeting`.
- 1:N con `Procedure`.
- 1:1 con `Budget`.
- 1:N con `Expense`.
- 1:N con `Alert`.
- 1:N con `ProjectChatMessage`.
- 1:N con `Diagnostic`.
- 1:N con `Need`.
- 1:N con `Ambition`.
- 1:N con `TechnicalReport`.
- 1:N con `TechnicalReportSchedule`.

---

## Objective

- `id`
- `project_id`
- `title`
- `description`
- `approval_status`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

### Relaciones

- N:1 con `Project`.
- 1:N con `Activity`.

---

## Activity

- `id`
- `objective_id`
- `title`
- `description`
- `status`
- `auto_complete_enabled`
- `completed_at`
- `created_at`
- `updated_at`

### Relaciones

- N:1 con `Objective`.
- 1:N con `Evidence`.

---

## Evidence

- `id`
- `activity_id`
- `type`
- `storage_reference`
- `url`
- `uploaded_by`
- `created_at`

`type` debe soportar:

- `FILE`
- `IMAGE`
- `VIDEO`
- `LINK`

---

## Meeting

- `id`
- `project_id`
- `scheduled_at`
- `provider`
- `meeting_url`
- `recording_reference`
- `created_at`

---

## MeetingTranscript

- `id`
- `meeting_id`
- `content`
- `source`
- `created_at`

En el MVP, la transcripción se incorpora manualmente.

---

## MeetingMinutes

- `id`
- `meeting_id`
- `content`
- `generated_by_ai`
- `generated_at`
- `review_status`
- `reviewed_by`

Una minuta generada por IA inicia en `DRAFT` y requiere revisión antes de publicarse. Los estados finales de publicación pueden ajustarse posteriormente.


---

## Procedure

- `id`
- `project_id`
- `meeting_id`
- `type`
- `status`
- `supplier_or_beneficiary`
- `amount`
- `currency`
- `description`
- `justification`
- `required_at`
- `created_by`
- `created_at`
- `submitted_at`
- `received_at`
- `reviewed_by`
- `review_observation`
- `internally_approved_by`
- `internally_approved_at`
- `approval_note`
- `document_number`
- `sent_to_fundatec_by`
- `sent_to_fundatec_at`
- `fundatec_consecutive_number`
- `decision_by`
- `decision_at`
- `closure_reason`

`type` debe soportar `PURCHASE_ORDER`, `CONTRACT_PAYMENT`, `REIMBURSEMENT` y `OTHER`.

`status` debe soportar `DRAFT`, `UNDER_REVIEW`, `REQUIRES_CORRECTION`, `INTERNALLY_APPROVED`, `IN_SIGNATURE_PROCESS`, `IN_FUNDATEC_SYSTEM`, `APPROVED` y `REJECTED_OR_CANCELLED`.

`meeting_id` es opcional y relaciona el trámite con una sesión/minuta de aprobación cuando aplique.

`closure_reason` es obligatorio en `REJECTED_OR_CANCELLED`. Los registros en estado `APPROVED` son inmutables en el MVP.

---

## ProcedureReviewChecklist

- `id`
- `procedure_id`
- `budget_available`
- `quotation_verified`
- `justification_verified`
- `supplier_or_beneficiary_verified`
- `amount_verified`
- `dates_verified`
- `invoice_applicable`
- `invoice_verified`
- `minutes_applicable`
- `minutes_verified`
- `reviewed_by`
- `reviewed_at`

El checklist registra la revisión administrativa. Los campos de factura y minuta pueden marcarse como no aplicables cuando corresponda.

---

## ProcedureDocument

- `id`
- `procedure_id`
- `type`
- `storage_reference`
- `url`
- `uploaded_by`
- `created_at`

`type` debe soportar al menos `QUOTATION`, `INVOICE`, `COMPARISON`, `APPROVAL_MINUTES` y `SUPPORTING`.

---

## Budget

- `id`
- `project_id`
- `amount`
- `currency`
- `created_at`
- `updated_at`

---

## Expense

- `id`
- `project_id`
- `procedure_id`
- `amount`
- `currency`
- `description`
- `date`
- `created_by`
- `created_at`

Cada gasto contabilizado se origina en un trámite aprobado. `procedure_id` debe ser único para evitar duplicar el consumo presupuestario.

---

## Asset (post-MVP)

- `id`
- `project_id`
- `external_reference`
- `name`
- `description`
- `acquisition_date`
- `value`

Este registro y su integración con Excel están fuera del MVP actual. Su estructura exacta depende del Excel existente.

---

## Alert

- `id`
- `project_id`
- `type`
- `status`
- `message`
- `created_at`
- `resolved_at`

---

## ProjectChatMessage

- `id`
- `project_id`
- `author_id`
- `content`
- `created_at`
- `updated_at`
- `deleted_at`
- `deleted_by`

Un mensaje eliminado visualmente conserva su registro y metadatos de eliminación, pero deja de mostrar su contenido en el chat.

---

## ChatAttachment

- `id`
- `message_id`
- `file_name`
- `mime_type`
- `size_bytes`
- `storage_reference`
- `uploaded_by`
- `created_at`

Los adjuntos son privados y pueden ser de cualquier tipo de archivo.

---

## ChatMention

- `id`
- `message_id`
- `mentioned_user_id`
- `created_at`

La persona mencionada debe ser miembro del proyecto del mensaje.

---

## ChatReadReceipt

- `id`
- `project_id`
- `user_id`
- `last_read_message_id`
- `updated_at`

Permite calcular mensajes no leídos por usuario y proyecto.

---

## Notification

- `id`
- `user_id`
- `type`
- `project_id`
- `message_id`
- `read_at`
- `email_sent_at`
- `created_at`

Representa las notificaciones internas y el envío de correo relacionados con actividad del chat.

---

## AuditLog

Recomendado para acciones relevantes:

- `id`
- `actor_id`
- `entity_type`
- `entity_id`
- `action`
- `previous_data`
- `new_data`
- `created_at`

La estrategia definitiva de auditoría está `TBD`.

---

## DiagnosticArea

- `id`
- `code`
- `name`
- `description`
- `guide_question`
- `icon`
- `color`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

Catálogo extensible. El conjunto inicial corresponde a las ocho áreas definidas en PR-DIA-002.

---

## Diagnostic

- `id`
- `project_id`
- `performed_by`
- `diagnosed_at`
- `type`
- `general_observation`
- `status`
- `submitted_at`
- `approved_by`
- `approved_at`
- `supersedes_diagnostic_id`
- `created_at`
- `updated_at`

`type` soporta `INITIAL`, `FOLLOW_UP` y `CLOSURE`. `status` soporta `DRAFT`, `SUBMITTED`, `APPROVED` y `ARCHIVED`. `supersedes_diagnostic_id` conserva la cadena de correcciones. Un registro `APPROVED` es inmutable.

---

## DiagnosticAssessment

- `id`
- `diagnostic_id`
- `diagnostic_area_id`
- `area_name_snapshot`
- `guide_question_snapshot`
- `score`
- `observation`
- `context_evidence`
- `created_at`
- `updated_at`

La restricción `score` permite valores enteros de 1 a 5. Las respuestas o notas por aspecto se guardan en `DiagnosticAssessmentResponse`.

## DiagnosticAssessmentResponse

- `id`
- `assessment_id`
- `aspect`
- `response`
- `created_at`
- `updated_at`

---

## Need

- `id`
- `project_id`
- `diagnostic_area_id`
- `detected_in_diagnostic_id`
- `title`
- `description`
- `priority`
- `status`
- `responsible_id`
- `detected_at`
- `resolved_at`
- `closure_justification`
- `created_at`
- `updated_at`

`priority` soporta `HIGH`, `MEDIUM` y `LOW`. `status` soporta `IDENTIFIED`, `VALIDATED`, `IN_PLANNING`, `PARTIALLY_ADDRESSED`, `ADDRESSED` y `DISCARDED`.

## NeedObjective, NeedActivity, NeedEvidence, NeedMeeting y NeedAmbition

Tablas de relación N:M entre una necesidad y, respectivamente, `Objective`, `Activity`, `Evidence`, `Meeting` y `Ambition`. Las relaciones no cambian de manera automática el estado de la necesidad.

---

## Ambition

- `id`
- `project_id`
- `type`
- `title`
- `work_area`
- `category`
- `description`
- `status`
- `responsible_id`
- `start_at`
- `due_at`
- `measurement_method`
- `verification_required`
- `aggregated_progress`
- `created_at`
- `updated_at`

`type` soporta `DREAM`, `VISION`, `PURPOSE`, `AMBITION`, `OBJECTIVE`, `GOAL`, `MILESTONE` y `PROJECT`. Las validaciones por tipo se aplican en backend conforme a PR-AMB-002.

## AmbitionObjective

- `ambition_id`
- `objective_id`
- `created_at`

Relación N:M. Para `Ambition.type = OBJECTIVE` debe existir al menos un `objective_id`; los objetivos operativos no se duplican.

---

## TechnicalReport

- `id`
- `project_id`
- `type`
- `period_start`
- `period_end`
- `current_version_id`
- `created_by`
- `created_at`
- `updated_at`

Representa el informe lógico. `type` soporta `FOLLOW_UP` y `CLOSURE`. Cada informe agrupa versiones para un período y proyecto.

## TechnicalReportSchedule

- `id`
- `project_id`
- `period_days`
- `next_due_at`
- `is_active`
- `created_by`
- `created_at`
- `updated_at`

Configura la periodicidad por proyecto. Al vencer `next_due_at`, el worker crea una alerta de preparación y calcula el siguiente vencimiento; no crea un informe automáticamente.

## TechnicalReportVersion

- `id`
- `technical_report_id`
- `version_number`
- `status`
- `content_snapshot`
- `created_by`
- `submitted_at`
- `approved_by`
- `approved_at`
- `issued_at`
- `supersedes_version_id`
- `created_at`
- `updated_at`

`status` soporta `DRAFT`, `SUBMITTED`, `APPROVED`, `ISSUED` y `ARCHIVED`. `content_snapshot` conserva secciones, redacción, valores, campos `Pendiente de completar` y metadatos de las fuentes al aprobar. Tras aprobar, contenido y fuentes no se modifican; el único cambio posterior permitido en esa versión es la transición técnica `APPROVED -> ISSUED` al registrar su PDF.

## TechnicalReportSourceReference

- `id`
- `report_version_id`
- `section`
- `source_type`
- `source_id`
- `source_snapshot`
- `selected_by`
- `created_at`

Referencia trazable a entidades del proyecto, incluyendo `Objective`, `Activity`, `Evidence`, `Meeting`, `MeetingMinutes`, `Diagnostic`, `Need`, `Ambition`, `Procedure`, `ProcedureDocument`, `Budget`, `Expense`, `Asset` si existe y `AuditLog`. `source_snapshot` evita que una modificación posterior cambie el informe emitido.

## TechnicalReportManualEntry

- `id`
- `report_version_id`
- `section`
- `content`
- `created_by`
- `created_at`
- `updated_at`

Registra redacción complementaria sin modificar entidades fuente. Debe contar con una o más `TechnicalReportSourceReference`, salvo que el valor sea explícitamente `Pendiente de completar`.

## TechnicalReportDocument

- `id`
- `report_version_id`
- `type`
- `storage_reference`
- `uploaded_by`
- `created_at`

`type` soporta `ISSUED_PDF` y `SIGNED_COPY`. Ambos archivos son privados; `ISSUED_PDF` solo existe después de aprobar la versión.
