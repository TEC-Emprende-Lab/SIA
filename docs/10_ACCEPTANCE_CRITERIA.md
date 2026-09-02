# Criterios de aceptación globales

## AC-001 — Acceso por proyecto

Un Gestor no puede consultar un proyecto no asignado, salvo permiso global explícito.

## AC-002 — Acceso de emprendedor

Un Emprendedor no puede consultar proyectos ajenos.

## AC-003 — Aprobación propia

Un Emprendedor no puede aprobar sus propios objetivos.

## AC-004 — Cambio invalida aprobación

Modificar un objetivo aprobado debe invalidar automáticamente su aprobación anterior.

## AC-005 — Varios gestores

Debe ser posible asignar más de un Gestor al mismo proyecto.

## AC-006 — Gestor multi-proyecto

Debe ser posible asignar el mismo Gestor a múltiples proyectos.

## AC-007 — Estados de proyecto

Un proyecto debe poder representarse al menos como `ACTIVE` o `FINISHED`.

## AC-008 — Pesos

La interfaz no debe ofrecer configuración de peso individual para objetivos o actividades.

## AC-009 — Evidencias

El sistema debe admitir evidencia como:

- archivo;
- fotografía;
- video;
- enlace.

## AC-009A — Kanban de actividades

El sistema debe ofrecer un tablero Kanban por proyecto que organice las actividades por estado. Cada tarjeta debe identificar el objetivo asociado y evidencias disponibles, sin alterar el avance ni el flujo de aprobación al cambiar de vista.

## AC-010 — Historial de aprobación

Debe poder determinarse:

- quién aprobó;
- cuándo aprobó;
- qué entidad fue aprobada.

## AC-011 — Inicio de trámite financiero

Un Emprendedor puede guardar un trámite en `DRAFT` y enviarlo a `UNDER_REVIEW`; iniciar o enviar un trámite no equivale a aprobarlo.

## AC-012 — Presupuesto de trámites

El monto aprobado debe derivarse únicamente de trámites en estado `APPROVED`; el monto en proceso debe derivarse de trámites en `UNDER_REVIEW`, `REQUIRES_CORRECTION`, `INTERNALLY_APPROVED`, `IN_SIGNATURE_PROCESS` o `IN_FUNDATEC_SYSTEM`.

El saldo disponible debe derivarse de `presupuesto asignado - monto aprobado`, no de valores ingresados manualmente.

## AC-019 — Datos y documentos de trámite

Un trámite debe registrar tipo, proveedor o beneficiario, descripción, justificación, monto estimado y fecha requerida, y permitir adjuntar cotización, factura, comparación, minuta de aprobación y otros documentos de respaldo.

## AC-020 — Transiciones de trámite

Solo un Gestor asignado o una Coordinadora puede solicitar correcciones, aprobar internamente, gestionar firmas, enviar un trámite a FUNDATEC o aprobarlo. Las transiciones administrativas deben registrar actor y fecha.

## AC-021 — Reportes de trámites

El sistema debe permitir consultar movimientos de trámites agrupados o filtrados por sesión, mes y proyecto, respetando el alcance del rol.

## AC-022 — Inmutabilidad de trámite aprobado

Un trámite en estado `APPROVED` no puede modificarse ni anularse, y no puede revertir el presupuesto en el MVP.

## AC-023 — Corrección y cierre de trámite

Solo un trámite en `REQUIRES_CORRECTION` puede ser corregido y reenviado por el Emprendedor. Un trámite en `REJECTED_OR_CANCELLED` debe conservar su motivo de cierre.

## AC-024 — Acceso al chat por proyecto

Solo los miembros de un proyecto pueden leer o enviar mensajes en su chat. La Coordinadora puede consultar los chats de todos los proyectos.

## AC-025 — Menciones y adjuntos del chat

Una mención solo puede dirigirse a un miembro del mismo proyecto. Los adjuntos del chat deben permanecer privados y estar disponibles únicamente para personas autorizadas.

## AC-026 — Notificaciones del chat

Las menciones y mensajes no leídos deben generar una notificación interna y un correo para las personas destinatarias.

## AC-027 — Edición y eliminación visual

La edición de un mensaje y su eliminación visual deben conservar actor y fecha en auditoría. El mensaje eliminado no debe mostrar su contenido original en el chat.

## AC-013 — Autorización en backend

Ocultar un botón en frontend no es suficiente para restringir una acción.

## AC-014 — Invitación segura

Una cuenta Google no puede acceder sin una invitación vigente, no utilizada y asociada al mismo correo.

## AC-015 — Excel unidireccional

La integración con Excel está fuera del MVP. Si se incorpora, no debe modificar el archivo fuente.

## AC-016 — Minuta IA

Una minuta generada con IA debe quedar identificada como contenido generado automáticamente.

## AC-017 — Revisión de minuta

Una minuta generada por IA debe iniciar como borrador y no puede publicarse sin revisión de un Gestor o Coordinadora.

## AC-018 — Archivos privados

Una evidencia privada solo puede entregarse mediante acceso autorizado; no debe depender de una URL pública permanente.
