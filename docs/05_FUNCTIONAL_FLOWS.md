# Flujos funcionales

## FL-001 — Inicio de sesión con Google

1. El usuario selecciona iniciar sesión con Google.
2. El sistema inicia OAuth.
3. Google autentica al usuario.
4. El backend valida que la cuenta tenga autorización.
5. Se crea la sesión.
6. El usuario accede según su rol.

---

## FL-002 — Invitación y activación de acceso

1. Una Coordinadora o un Gestor autorizado crea una invitación para un emprendedor; la Coordinadora también puede invitar otros roles.
2. El sistema registra correo, rol, emisor, expiración y el proyecto cuando la invitación la crea un Gestor.
3. Se envía un enlace seguro por correo.
4. La persona abre el enlace e inicia sesión con Google.
5. El backend valida que el correo Google coincida con una invitación vigente y no utilizada.
6. Se crea la sesión con el rol asignado y la invitación queda utilizada.

---

## FL-003 — Creación de proyecto

1. Una Coordinadora o Gestor crea el proyecto.
2. Completa la información requerida.
3. Asigna uno o varios gestores.
4. Asocia uno o varios emprendedores.
5. El sistema crea el proyecto como `ACTIVE`.
6. Si el creador es un Gestor, queda asignado al proyecto.

Campos exactos del proyecto: `TBD`.

---

## FL-004 — Creación y aprobación de objetivo

1. Un usuario autorizado crea un objetivo.
2. El objetivo queda `PENDING_APPROVAL`.
3. El gestor asignado lo revisa.
4. El gestor puede aprobarlo o solicitar cambios.
5. Si se aprueba, queda `APPROVED`.
6. Si posteriormente cambia cualquier dato material, vuelve a `PENDING_APPROVAL`.

Los estados exactos pueden ajustarse, pero deben respetar esta semántica.

---

## FL-005 — Actividad

1. Se crea una actividad dentro de un objetivo.
2. Se indica si admite autocompletado.
3. La actividad permanece pendiente mientras no cumpla la condición de cierre.
4. Puede completarse manual o automáticamente según configuración.
5. Se actualiza el avance.

---

## FL-006 — Evidencia

1. El usuario abre una actividad o contexto de seguimiento.
2. Selecciona agregar evidencia.
3. Adjunta archivo/foto/video o URL.
4. El backend valida el tipo.
5. Se almacena la referencia.
6. La evidencia queda visible en el historial.

---

## FL-006A — Vista Kanban de actividades

1. El usuario abre Objetivos y actividades de un proyecto.
2. Selecciona la vista Kanban.
3. El sistema organiza las actividades del proyecto en columnas según su estado de trabajo.
4. Cada tarjeta muestra su objetivo asociado, responsable cuando aplique, fecha relevante y cantidad de evidencias.
5. El usuario puede abrir la actividad desde su tarjeta para consultar o gestionar su información según sus permisos.

La vista es una representación del estado existente y no modifica por sí misma el avance ni la aprobación de objetivos.

---

## FL-007 — Reunión y minuta

1. Se registra una reunión.
2. Se asocia al proyecto.
3. Se vincula Meet/Zoom cuando corresponda.
4. Se incorpora una referencia a grabación o una transcripción proporcionada manualmente.
5. La IA genera una minuta a partir de la transcripción.
6. La minuta queda almacenada como borrador.
7. Un Gestor o Coordinadora la revisa antes de publicarla.

---

## FL-008 — Detección de seguimiento faltante

1. El sistema evalúa los registros recientes del proyecto.
2. Detecta ausencia de la bitácora o seguimiento esperado.
3. Genera una alerta.
4. La alerta aparece para Gestor y/o Coordinadora.
5. El criterio para cerrar la alerta está `TBD`.

---

## FL-009 — Trámite financiero

1. El Emprendedor inicia un trámite de compra, reintegro o pago asociado a un proyecto.
2. Registra tipo, proveedor o beneficiario, descripción, justificación, monto estimado, fecha requerida y adjunta cotización o documentos necesarios.
3. Puede guardar el trámite en `DRAFT` o enviarlo en `UNDER_REVIEW`.
4. Un Gestor o Coordinadora valida presupuesto, documentos, proveedor, monto, fechas, factura y minuta cuando aplique.
5. Puede devolverlo a `REQUIRES_CORRECTION` con una observación; el Emprendedor lo corrige y reenvía a `UNDER_REVIEW`.
6. Puede rechazar o cancelar el trámite en `REJECTED_OR_CANCELLED`, registrando el motivo.
7. Si la solicitud es viable, cambia a `INTERNALLY_APPROVED` y registra la nota de aprobación.
8. Al iniciar firmas, cambia a `IN_SIGNATURE_PROCESS`.
9. Al enviarlo a gestión administrativa, cambia a `IN_FUNDATEC_SYSTEM` y registra actor, fecha y consecutivo FUNDATEC.
10. Al ser aceptado, cambia a `APPROVED`, registra actor y fecha, y el monto se contabiliza como aprobado del proyecto.
11. Un trámite `APPROVED` no puede modificarse ni anularse.

---

## FL-010 — Presupuesto y gasto

1. Se configura presupuesto del proyecto.
2. Los trámites aprobados se contabilizan como gastos asociados al proyecto.
3. Cada trámite en `APPROVED` incrementa el monto aprobado una sola vez.
4. El saldo disponible se calcula como:

`presupuesto asignado - monto aprobado`

El monto en proceso se informa por separado y no reduce el saldo disponible.

---

## FL-011 — Importación desde Excel (post-MVP)

La importación de activos desde Excel está fuera del MVP actual. Si se implementa, será unidireccional hacia la plataforma y no modificará el archivo fuente.

---

## FL-012 — Chat del proyecto

1. Un miembro abre el chat general de uno de sus proyectos.
2. Escribe un mensaje y, opcionalmente, adjunta archivos o menciona miembros del mismo proyecto.
3. El backend valida que el autor pertenezca al proyecto y que cada mención sea válida.
4. El mensaje y sus adjuntos privados quedan asociados al proyecto.
5. El sistema actualiza los mensajes no leídos y crea notificaciones internas y por correo para las personas destinatarias.
6. El autor puede editar el mensaje; la modificación queda registrada en auditoría.
7. El autor puede eliminar visualmente el mensaje; el contenido deja de mostrarse, mientras el registro de eliminación queda auditado.
