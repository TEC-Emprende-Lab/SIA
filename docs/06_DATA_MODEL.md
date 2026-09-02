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
