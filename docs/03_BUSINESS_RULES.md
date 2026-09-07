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

---

## BR-020 — Diagnóstico como fotografía histórica

Cada diagnóstico representa el estado de un proyecto en una fecha. Solo se comparan diagnósticos `APPROVED` ordenados por fecha de diagnóstico. Un diagnóstico aprobado no se edita: una corrección crea una nueva revisión en `DRAFT` que referencia al diagnóstico corregido, preservando ambos registros y su auditoría.

---

## BR-021 — Áreas de diagnóstico extensibles

Las áreas y preguntas guía pertenecen a un catálogo administrable. Las evaluaciones almacenan una referencia al área y una instantánea de nombre y pregunta guía, para que los diagnósticos históricos no cambien al actualizar el catálogo.

---

## BR-022 — Necesidades y cierre validado

Una necesidad nace en un diagnóstico y área concretos. Puede relacionarse N:M con ambiciones, objetivos, actividades, evidencias y reuniones. Completar actividades no cambia automáticamente una necesidad a `ADDRESSED`; solo un Gestor asignado o Coordinadora puede validar el cierre, con justificación y respaldo de evidencia o diagnóstico posterior.

---

## BR-023 — Ambiciones y objetivos operativos

Ambición es una entidad estratégica y no participa directamente en el cálculo de avance del proyecto. Una ambición de tipo `OBJECTIVE` debe vincular una entidad `Objective` existente o creada por su flujo normal; no crea un objetivo duplicado ni omite su aprobación. Solo los objetivos operativos aprobados participan en el cálculo existente.

---

## BR-024 — Autorización del seguimiento evolutivo

El Emprendedor puede proponer o completar borradores de diagnósticos, necesidades y ambiciones solo en sus proyectos. Gestores asignados y Coordinadora validan necesidades, aprueban diagnósticos y realizan transiciones de cierre. La Coordinadora puede consultar indicadores transversales; toda validación se aplica en backend.

---

## BR-025 — Informe técnico como instantánea trazable

Un informe técnico se construye desde registros autorizados del mismo proyecto y período, o desde aportes manuales que identifican actor y fuentes de respaldo. Al aprobar una versión, el sistema conserva una instantánea de su contenido y referencias fuente; cambios posteriores en el proyecto no modifican esa versión.

---

## BR-026 — Versionado y emisión de informes

Los informes soportan `FOLLOW_UP` y `CLOSURE`. El contenido y fuentes de una versión `APPROVED` son inmutables; su estado solo puede avanzar a `ISSUED` cuando el worker registra el PDF. Una corrección crea una nueva versión enlazada a la anterior. El PDF solo se genera desde una versión aprobada y una versión firmada se adjunta como documento privado, sin sustituir el PDF emitido ni su instantánea.

---

## BR-027 — Narrativa y datos faltantes del informe

La generación asistida de narrativa solo sintetiza fuentes seleccionadas y no inventa hechos, impactos, conclusiones, evidencias, aprobaciones ni causalidad. La ausencia de datos se presenta como `Pendiente de completar`. Completar actividades no cierra necesidades ni modifica diagnósticos por la preparación o emisión de un informe.

---

## BR-028 — Fuentes de cambios e impactos

Las modificaciones aprobadas de objetivos y presupuesto se obtienen de sus registros y auditoría existentes. Los campos estructurados del perfil del emprendimiento, el cambio formal de alcance y el catálogo de programa aún no cuentan con entidad de dominio definida; hasta que se definan, el informe debe indicarlos como `Pendiente de completar` y no puede declarar una aprobación o impacto sin fuente registrada.

---

## BR-029 — Periodicidad de informes

La periodicidad del informe se configura por proyecto y solo genera una alerta de preparación al vencerse. La alerta no crea una versión, no congela datos y no sustituye la solicitud explícita y aprobación humana del informe.
