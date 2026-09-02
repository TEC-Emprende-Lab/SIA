# Requerimientos del producto

## 1. Autenticación

### PR-AUTH-001

El sistema debe permitir autenticación mediante cuenta de Google.

### PR-AUTH-002

El primer acceso de una cuenta de Google requiere una invitación vigente creada por una Coordinadora o un Gestor y un correo coincidente. Los usuarios ya activados pueden iniciar sesión con su cuenta Google registrada mientras mantengan acceso activo.

### PR-AUTH-003

El MVP no contempla autenticación local mediante correo y contraseña ni recuperación de contraseña.

---

## 2. Gestión de usuarios

### PR-USR-001

El sistema debe manejar al menos los roles:

- Coordinadora;
- Gestor;
- Emprendedor.

### PR-USR-002

Un emprendedor puede formar parte de un proyecto individual o de un equipo.

### PR-USR-003

Un gestor puede estar asignado a múltiples proyectos.

---

## 3. Gestión de proyectos

### PR-PROJ-001

El sistema debe permitir registrar proyectos incubados.

### PR-PROJ-002

Los estados mínimos de un proyecto son:

- `ACTIVE`;
- `FINISHED`.

### PR-PROJ-003

Un proyecto puede tener múltiples gestores.

### PR-PROJ-004

Un proyecto puede tener uno o varios emprendedores.

### PR-PROJ-005

Debe existir una vista consolidada de cada proyecto.

La vista debe permitir acceder al menos a:

- resumen;
- objetivos;
- actividades;
- evidencias;
- reuniones;
- minutas;
- finanzas y compras;
- alertas.
- chat del proyecto.

---

## 4. Objetivos

### PR-OBJ-001

Un proyecto debe poder contener objetivos.

### PR-OBJ-002

Los objetivos propuestos deben ser aprobados por un gestor.

### PR-OBJ-003

Una vez aprobado un objetivo, cualquier modificación debe requerir una nueva aprobación.

### PR-OBJ-004

Los objetivos no deben permitir asignación manual de pesos diferentes.

### PR-OBJ-005

Todos los objetivos participan con igual peso en el cálculo de avance, salvo que posteriormente se defina otra regla.

---

## 5. Actividades

### PR-ACT-001

Un objetivo puede contener una o varias actividades.

### PR-ACT-002

Las actividades no deben permitir ponderaciones diferentes.

### PR-ACT-003

Al crear una actividad debe existir una opción para indicar si puede completarse automáticamente.

### PR-ACT-004

El comportamiento exacto que dispara el autocompletado está `TBD`.

### PR-ACT-005

El sistema debe ofrecer una vista Kanban por proyecto para organizar visualmente las actividades según su estado de trabajo. Cada tarjeta debe mostrar el objetivo asociado, responsable cuando aplique, fecha relevante y evidencias disponibles.

La vista Kanban complementa la vista jerárquica de objetivos y actividades; no modifica las reglas de avance ni aprobación.

---

## 6. Evidencias

### PR-EVI-001

El sistema debe permitir asociar evidencias a actividades o avances.

### PR-EVI-002

Las evidencias pueden ser:

- archivos;
- fotografías;
- videos;
- enlaces.

### PR-EVI-003

Los límites de tamaño, tipos MIME permitidos y almacenamiento están `TBD`.

---

## 7. Reuniones y minutas

### PR-MTG-001

El sistema debe registrar reuniones asociadas a proyectos.

### PR-MTG-002

El seguimiento esperado incluye reuniones aproximadamente mensuales.

### PR-MTG-003

El sistema debe contemplar reuniones realizadas mediante:

- Google Meet;
- Zoom.

### PR-MTG-004

Debe existir soporte para almacenar o relacionar una grabación cuando esté disponible.

### PR-MTG-005

Debe existir soporte para almacenar una transcripción proporcionada manualmente.

### PR-MTG-006

El sistema debe contemplar generación automática de minuta mediante IA.

### PR-MTG-007

Toda minuta generada por IA debe iniciar como borrador y requerir revisión humana antes de publicarse.

---

## 8. Alertas y bitácoras

### PR-ALT-001

El sistema debe generar alertas relacionadas con seguimiento pendiente.

### PR-ALT-002

Debe ser posible detectar bitácoras o registros faltantes.

### PR-ALT-003

La periodicidad exacta y reglas para determinar una bitácora faltante están `TBD`.

---

## 9. Trámites financieros

### PR-TRM-001

El sistema debe registrar y controlar trámites de compra, reintegro y pago asociados a proyectos.

### PR-TRM-002

Un Emprendedor debe poder crear una solicitud como borrador y completar:

- tipo de trámite;
- proveedor o beneficiario;
- descripción y justificación;
- monto estimado;
- fecha requerida;
- cotización mediante archivo o enlace;
- documentos adicionales cuando apliquen.

El proyecto se asigna automáticamente desde el contexto del proyecto del Emprendedor; no puede asociarse a un proyecto ajeno. El Emprendedor puede enviar la solicitud cuando esté completa.

### PR-TRM-003

Los estados del trámite son:

- `DRAFT`: el Emprendedor aún completa la solicitud;
- `UNDER_REVIEW`: la Coordinación valida la información;
- `REQUIRES_CORRECTION`: el Emprendedor debe corregir datos o documentos;
- `INTERNALLY_APPROVED`: la incubadora autorizó continuar;
- `IN_SIGNATURE_PROCESS`: espera firmas o autorizaciones;
- `IN_FUNDATEC_SYSTEM`: fue enviado a gestión administrativa en FUNDATEC;
- `APPROVED`: el gasto fue aprobado y se descuenta del presupuesto;
- `REJECTED_OR_CANCELLED`: no continuará y conserva su motivo de cierre.

No agregar estados adicionales sin un requerimiento documentado.

### PR-TRM-004

Gestores y Coordinadoras revisan y completan la información administrativa: disponibilidad presupuestaria, checklist de documentos y datos, observación de revisión, número de factura o documento, fechas de ingreso y aprobación, número consecutivo FUNDATEC y nota de aprobación.

Pueden solicitar correcciones, rechazar o aprobar internamente una solicitud. La minuta de aprobación se adjunta cuando aplique.

### PR-TRM-005

Un trámite en estado `APPROVED` no puede modificarse ni anularse en el MVP. Las correcciones del Emprendedor se realizan únicamente en estado `REQUIRES_CORRECTION`.

---

## 10. Presupuesto y gastos

### PR-BUD-001

Cada proyecto debe poder tener un presupuesto.

### PR-BUD-002

El sistema debe registrar como gasto cada trámite aprobado asociado al proyecto, sin duplicar su impacto presupuestario.

### PR-BUD-003

Debe ser posible consultar al menos:

- presupuesto asignado;
- monto aprobado;
- monto en proceso;
- saldo disponible.

El monto aprobado se calcula a partir de los trámites en estado `APPROVED`; el monto en proceso se calcula a partir de los trámites que no estén en estado `DRAFT`, `APPROVED` ni `REJECTED_OR_CANCELLED`.

### PR-BUD-004

Gestores asignados y Coordinadoras pueden modificar el presupuesto del proyecto. El cambio debe conservar trazabilidad.

### PR-BUD-005

La información de presupuesto, trámites de compra/pago/reintegro, gastos derivados y reportes financieros debe presentarse dentro de un único módulo de proyecto denominado **Finanzas y compras**.

El módulo debe priorizar una vista resumida de presupuesto asignado, monto aprobado, monto en proceso y saldo disponible, con acceso inmediato a las solicitudes y sus estados.

---

## 11. Activos

Este módulo está fuera del MVP y se evaluará en una etapa posterior.

### PR-AST-001

El sistema debe incorporar un registro de activos.

### PR-AST-002

Actualmente existe información de activos en Excel que podrá utilizarse en una etapa posterior.

### PR-AST-003

La posible integración futura sería unidireccional desde Excel hacia la plataforma.

### PR-AST-004

El esquema exacto de datos del registro de activos está `TBD`.

---

## 12. Dashboard

### PR-DSH-001

La Coordinadora debe disponer de un dashboard global.

### PR-DSH-002

El dashboard debe permitir visualizar:

- proyectos;
- estado de proyectos;
- alertas;
- estadísticas generales.

### PR-DSH-003

El dashboard debe incluir reportes de trámites financieros por sesión, mes y proyecto. La información se limita al alcance autorizado del usuario.

---

## 13. Chat por proyecto

### PR-CHAT-001

Cada proyecto debe disponer de un único chat general para sus miembros.

### PR-CHAT-002

Los miembros del proyecto deben poder enviar mensajes, adjuntar archivos de cualquier tipo y mencionar a otros miembros del mismo proyecto.

### PR-CHAT-003

El sistema debe mostrar mensajes no leídos y generar notificaciones dentro de la plataforma y por correo electrónico ante menciones o actividad relevante del chat.

### PR-CHAT-004

El autor puede editar o eliminar visualmente sus mensajes. La eliminación no borra el registro histórico: debe conservarse el actor, fecha y acción de eliminación para auditoría.

### PR-CHAT-005

El MVP no contempla mensajes directos ni chats separados por trámite.
