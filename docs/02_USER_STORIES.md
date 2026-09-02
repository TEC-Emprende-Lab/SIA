# User Stories

## Autenticación

### US-001 — Iniciar sesión con Google

**Como** usuario autorizado  
**quiero** iniciar sesión con mi cuenta de Google  
**para** acceder a la plataforma sin crear otra contraseña.

#### Criterios de aceptación

- El usuario puede iniciar el flujo de autenticación con Google.
- Solo usuarios autorizados pueden acceder.
- El sistema crea o vincula la identidad correspondiente.

---

### US-002 — Activar acceso mediante invitación

**Como** usuario invitado  
**quiero** recibir un enlace de acceso y autenticarme con Google  
**para** ingresar a la plataforma con el rol que se me asignó.

#### Criterios de aceptación

- La invitación registra el correo y el rol asignado.
- El sistema envía un enlace seguro por correo.
- La invitación expira y no puede utilizarse más de una vez.
- El correo de la cuenta Google debe coincidir con el de la invitación.

---

## Proyectos

### US-003 — Crear proyecto

**Como** Coordinadora o Gestor  
**quiero** registrar un proyecto incubado  
**para** darle seguimiento dentro de la plataforma.

#### Criterios de aceptación

- Se puede crear un proyecto.
- El proyecto inicia en estado `ACTIVE`.
- Se pueden asociar uno o varios gestores.
- Se pueden asociar uno o varios emprendedores.
- Si lo crea un Gestor, este queda asignado al proyecto.

---

### US-004 — Asignar múltiples gestores

**Como** Coordinadora  
**quiero** asignar varios gestores a un proyecto  
**para** permitir acompañamiento compartido.

#### Criterios de aceptación

- Un proyecto puede tener más de un gestor.
- Un gestor puede estar en varios proyectos.
- La asignación queda persistida.

---

### US-005 — Finalizar proyecto

**Como** usuario autorizado  
**quiero** marcar un proyecto como finalizado  
**para** indicar que terminó su proceso de incubación.

#### Criterios de aceptación

- El estado cambia de `ACTIVE` a `FINISHED`.
- La información histórica se conserva.
- La acción puede ejecutarla una Coordinadora o un Gestor asignado.

---

## Objetivos

### US-006 — Crear objetivo

**Como** Emprendedor  
**quiero** registrar objetivos del proyecto  
**para** definir los resultados que debo alcanzar.

#### Criterios de aceptación

- El objetivo queda asociado al proyecto.
- El objetivo debe pasar por aprobación.
- Un objetivo pendiente no debe considerarse aprobado.

---

### US-007 — Aprobar objetivo

**Como** Gestor  
**quiero** aprobar los objetivos propuestos  
**para** validar formalmente el plan de trabajo.

#### Criterios de aceptación

- El gestor puede aprobar un objetivo de un proyecto asignado.
- El estado de aprobación queda registrado.
- Se conserva la fecha y actor de la aprobación.

---

### US-008 — Modificar objetivo aprobado

**Como** Emprendedor  
**quiero** modificar un objetivo previamente aprobado  
**para** ajustar el proyecto cuando sea necesario.

#### Criterios de aceptación

- El sistema permite la modificación según permisos.
- La aprobación anterior deja de ser válida.
- El objetivo vuelve a estado pendiente de aprobación.

---

## Actividades

### US-009 — Crear actividades

**Como** Emprendedor  
**quiero** dividir un objetivo en actividades  
**para** registrar el trabajo necesario para alcanzarlo.

#### Criterios de aceptación

- La actividad se asocia a un objetivo.
- No se asignan pesos manuales.
- Puede configurarse la opción de autocompletado.

---

### US-010 — Completar actividad

**Como** usuario autorizado  
**quiero** marcar una actividad como completada  
**para** reflejar el avance real del proyecto.

#### Criterios de aceptación

- Se registra el estado completado.
- Se conserva la fecha de finalización.
- El impacto exacto sobre el porcentaje de avance debe seguir las reglas documentadas.

---

### US-010A — Visualizar actividades en Kanban

**Como** miembro de un proyecto  
**quiero** visualizar las actividades organizadas por estado en un tablero Kanban  
**para** identificar fácilmente el trabajo pendiente, en curso, en revisión y completado.

#### Criterios de aceptación

- El tablero corresponde a un proyecto específico.
- Cada actividad muestra su objetivo asociado, fecha relevante y evidencias disponibles.
- Las columnas representan estados de trabajo definidos para actividades.
- La visualización Kanban no altera los cálculos de avance ni las aprobaciones.

---

## Evidencias

### US-011 — Adjuntar evidencia

**Como** Emprendedor  
**quiero** adjuntar evidencia a mi trabajo  
**para** demostrar el cumplimiento de actividades.

#### Criterios de aceptación

- Puede adjuntarse archivo, fotografía, video o enlace.
- La evidencia queda relacionada con el proyecto y su contexto.
- El usuario puede consultar posteriormente la evidencia.

---

## Reuniones

### US-012 — Registrar reunión

**Como** Gestor  
**quiero** registrar las reuniones realizadas con el proyecto  
**para** mantener una bitácora del acompañamiento.

#### Criterios de aceptación

- La reunión queda asociada a un proyecto.
- Se registra fecha.
- Puede relacionarse con Meet o Zoom.
- Puede almacenar referencia a grabación y transcripción.

---

### US-013 — Generar minuta con IA

**Como** Gestor  
**quiero** generar automáticamente una minuta a partir de la transcripción  
**para** reducir el trabajo manual posterior a una reunión.

#### Criterios de aceptación

- La IA utiliza la transcripción disponible.
- La minuta generada queda asociada a la reunión.
- Debe conservarse indicación de que fue generada automáticamente.
- La minuta inicia como borrador y requiere revisión de un Gestor o Coordinadora antes de publicarse.

---

## Seguimiento

### US-014 — Visualizar alertas

**Como** Gestor  
**quiero** recibir alertas sobre seguimientos pendientes  
**para** identificar rápidamente proyectos que requieren atención.

#### Criterios de aceptación

- Las alertas se asocian al proyecto correspondiente.
- Deben ser visibles dentro de la plataforma.
- Las reglas exactas de generación se documentarán antes de implementación definitiva.

---

### US-015 — Detectar bitácoras faltantes

**Como** Coordinadora  
**quiero** identificar proyectos sin registros de seguimiento esperados  
**para** detectar incumplimientos del proceso.

#### Criterios de aceptación

- El sistema puede determinar que falta un registro esperado.
- Se genera una alerta.
- La periodicidad exacta está `TBD`.

---

## Trámites financieros y presupuesto

### US-016 — Iniciar trámite financiero

**Como** Emprendedor  
**quiero** guardar y enviar una solicitud de compra, reintegro o pago para mi proyecto  
**para** que la Coordinación gestione el movimiento financiero.

#### Criterios de aceptación

- El proyecto se asigna automáticamente desde el contexto de uno de los proyectos del Emprendedor.
- La solicitud registra tipo, proveedor o beneficiario, descripción, justificación, monto estimado y fecha requerida.
- Se puede adjuntar cotización, documentos de respaldo y un enlace cuando corresponda.
- Puede guardarse en `DRAFT` y se envía a revisión en `UNDER_REVIEW`.

---

### US-017 — Revisar y gestionar trámite

**Como** Gestor o Coordinadora  
**quiero** revisar y gestionar una solicitud financiera  
**para** asegurar que esté completa antes de enviarla a FUNDATEC.

#### Criterios de aceptación

- Se valida presupuesto, cotización, justificación, proveedor o beneficiario, monto, fechas, factura y minuta cuando aplique.
- Se registra una observación al solicitar corrección, rechazar o aprobar internamente.
- El envío a FUNDATEC cambia el estado a `IN_FUNDATEC_SYSTEM` y registra actor, fecha y consecutivo FUNDATEC.
- La aprobación cambia el estado a `APPROVED`, registra actor, fecha y nota de aprobación, y afecta el presupuesto.

---

### US-018 — Consultar presupuesto

**Como** Emprendedor, Gestor o Coordinadora  
**quiero** consultar el presupuesto del proyecto  
**para** conocer su situación financiera.

#### Criterios de aceptación

- Se muestra presupuesto asignado.
- Se muestra monto aprobado y monto en proceso.
- Se muestra saldo disponible.

---

### US-019 — Consultar reportes de trámites

**Como** Gestor o Coordinadora  
**quiero** consultar reportes de trámites financieros  
**para** dar seguimiento a los movimientos de mis proyectos.

#### Criterios de aceptación

- Se pueden filtrar o agrupar los movimientos por sesión, mes y proyecto.
- Un Gestor solo consulta información de sus proyectos asignados.
- Una Coordinadora puede consultar la información global.

---

## Activos

### US-020 — Consultar activos (post-MVP)

**Como** Coordinadora o Gestor  
**quiero** consultar activos asociados a los proyectos  
**para** mantener trazabilidad sobre los recursos adquiridos.

#### Criterios de aceptación

- Los activos pueden importarse desde la fuente definida.
- Se pueden consultar desde la plataforma.
- La sincronización inicial es unidireccional desde Excel.

Esta historia está fuera del alcance del MVP actual.

---

## Dashboard

### US-021 — Dashboard global

**Como** Coordinadora  
**quiero** visualizar un resumen de todos los proyectos  
**para** conocer rápidamente la situación de la incubadora.

#### Criterios de aceptación

- Muestra proyectos activos y finalizados.
- Muestra alertas relevantes.
- Muestra estadísticas generales.
- Las métricas definitivas están `TBD`.

---

### US-022 — Vista consolidada del proyecto

**Como** Gestor  
**quiero** acceder a toda la información relevante de un proyecto desde un único lugar  
**para** darle seguimiento sin utilizar múltiples herramientas.

#### Criterios de aceptación

Debe dar acceso a:

- objetivos;
- actividades;
- evidencias;
- reuniones;
- minutas;
- finanzas y compras;
- alertas.
- chat del proyecto.

---

## Chat

### US-023 — Comunicarse en el chat del proyecto

**Como** miembro de un proyecto  
**quiero** intercambiar mensajes y archivos con los demás miembros  
**para** mantener la comunicación del proyecto centralizada en la plataforma.

#### Criterios de aceptación

- Existe un único chat general por proyecto.
- Solo miembros del proyecto pueden ver y enviar mensajes; la Coordinadora puede consultar todos los chats.
- Se pueden adjuntar archivos de cualquier tipo y mencionar miembros del mismo proyecto.
- Las menciones y mensajes no leídos generan notificaciones dentro de la plataforma y por correo.
- El autor puede editar o eliminar visualmente sus mensajes; ambos eventos quedan auditados.
- No existen mensajes directos ni chats separados por trámite en el MVP.
