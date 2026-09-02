# Reglas de negocio

## BR-001 — Relación proyecto-gestor

Un proyecto puede tener múltiples gestores.

Un gestor puede estar asignado a múltiples proyectos.

La relación es muchos-a-muchos.

---

## BR-002 — Relación proyecto-emprendedor

Un proyecto puede tener uno o varios emprendedores.

Un emprendedor puede pertenecer a múltiples proyectos.

---

## BR-003 — Estados del proyecto

Los estados mínimos definidos son:

- `ACTIVE`;
- `FINISHED`.

No agregar estados adicionales sin necesidad documentada.

---

## BR-004 — Aprobación de objetivos

Todo objetivo que requiera validación debe pasar por aprobación de un gestor autorizado.

---

## BR-005 — Modificación posterior a aprobación

Si un objetivo aprobado cambia, su aprobación anterior deja de ser válida.

El objetivo debe volver al estado de pendiente de aprobación.

---

## BR-006 — Ponderación de objetivos

No existen pesos configurables por objetivo.

Todos los objetivos tienen el mismo peso.

---

## BR-007 — Ponderación de actividades

No existen pesos configurables por actividad.

Todas las actividades de un mismo nivel participan de forma equivalente.

---

## BR-008 — Autocompletado

Una actividad puede marcarse al crearla como susceptible de completarse automáticamente.

La condición concreta de autocompletado está `TBD`.

---

## BR-009 — Evidencias

Una evidencia puede ser:

- archivo;
- fotografía;
- video;
- enlace.

---

## BR-010 — Historial

Las aprobaciones, modificaciones y acciones relevantes deben conservar trazabilidad.

No debe sobrescribirse silenciosamente información relevante para auditoría.

---

## BR-011 — Reuniones

Las reuniones forman parte del seguimiento de un proyecto.

La periodicidad operativa esperada es aproximadamente mensual, pero la regla exacta de obligatoriedad está `TBD`.

---

## BR-012 — Minutas automáticas

Una minuta puede generarse automáticamente mediante IA a partir de una transcripción.

La IA no debe inventar hechos que no estén respaldados por el contenido de la reunión.

Toda minuta generada por IA inicia como borrador y requiere revisión humana antes de publicarse.

---

## BR-013 — Presupuesto por proyecto

El presupuesto se administra a nivel de proyecto.

El monto aprobado equivale a la suma de los trámites en estado `APPROVED`.

El monto en proceso equivale a la suma de los trámites en estados `UNDER_REVIEW`, `REQUIRES_CORRECTION`, `INTERNALLY_APPROVED`, `IN_SIGNATURE_PROCESS` e `IN_FUNDATEC_SYSTEM`.

El saldo disponible se calcula como `presupuesto asignado - monto aprobado`. Un trámite solo descuenta presupuesto cuando llega a `APPROVED`.

---

## BR-014 — Trámites financieros

Un trámite puede corresponder a una compra por orden de compra, pago de contrato, reintegro u otro tipo permitido. Debe estar asociado a un proyecto.

El Emprendedor puede guardar un trámite como `DRAFT`, modificarlo y enviarlo a revisión. Solo puede volver a modificarlo cuando la Coordinación lo haya dejado en `REQUIRES_CORRECTION`.

Gestores y Coordinadoras revisan la solicitud mediante un checklist que verifica presupuesto, cotización, justificación, proveedor o beneficiario, monto, fechas, factura y minuta cuando aplique. Pueden solicitar correcciones, aprobar internamente, gestionar firmas, enviar a FUNDATEC y registrar la aprobación final.

Los únicos estados del MVP son `DRAFT`, `UNDER_REVIEW`, `REQUIRES_CORRECTION`, `INTERNALLY_APPROVED`, `IN_SIGNATURE_PROCESS`, `IN_FUNDATEC_SYSTEM`, `APPROVED` y `REJECTED_OR_CANCELLED`.

El estado `REJECTED_OR_CANCELLED` debe registrar un motivo de cierre. No se agregan estados adicionales sin un requerimiento documentado.

Un gasto contabilizado debe tener un único trámite aprobado asociado. No debe contabilizarse manualmente un gasto duplicado para el mismo trámite.

Un trámite `APPROVED` es inmutable: no se modifica, no se anula y no revierte presupuesto en el MVP. Las correcciones del Emprendedor solo se permiten en `REQUIRES_CORRECTION`.

---

## BR-015 — Excel

La integración con hojas de Excel está fuera del MVP actual y podrá evaluarse en una etapa posterior.

La integración inicial definida es unidireccional hacia la plataforma.

No escribir de vuelta al Excel sin requerimiento explícito.

---

## BR-016 — Autorización

La visibilidad y modificación de información depende del rol y de la relación del usuario con el proyecto.

La autorización debe validarse en backend.

---

## BR-017 — Acceso por invitación

El acceso se realiza exclusivamente mediante Google OAuth.

El primer acceso de una cuenta requiere una invitación vigente, no utilizada y asociada al mismo correo. La invitación define el rol inicial del usuario. Una vez activada la cuenta, los siguientes inicios de sesión se validan contra su usuario activo y su cuenta Google registrada.

---

## BR-018 — Alcance de roles operativos

La Coordinadora puede ejecutar todas las operaciones de un Gestor en cualquier proyecto y tiene acceso a datos y reportes globales.

El Gestor puede ejecutar las operaciones permitidas en sus proyectos asignados, incluido crear proyectos, invitar emprendedores y gestionar los emprendedores de esos proyectos. Al crear un proyecto, el Gestor creador queda asignado a este. No puede asignar ni remover gestores.

---

## BR-019 — Chat por proyecto

Cada proyecto tiene un único chat general. Los miembros del proyecto pueden leer y escribir en su chat; la Coordinadora puede consultar los chats de todos los proyectos.

Las menciones solo pueden dirigirse a miembros del mismo proyecto. Los archivos adjuntos son privados y se entregan únicamente tras validar autorización.

El autor puede editar o eliminar visualmente sus mensajes. Una eliminación no destruye el historial: el mensaje deja de mostrar su contenido, pero se conserva la acción, el actor y la fecha en auditoría. No existen mensajes directos ni chats separados por trámite en el MVP.
