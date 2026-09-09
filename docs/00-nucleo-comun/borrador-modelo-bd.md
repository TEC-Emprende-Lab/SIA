# Borrador de modelo de datos — mis notas de analisis

Me sente a leer toda la carpeta `docs` (el nucleo comun y los tres programas) para ir sacando que tablas
y columnas va a necesitar SIA. Esto no es el modelo final ni un diagrama todavia, sino lo que fui anotando
para despues cerrarlo y de ahi armar el ER.

## Hasta aqui llegue

Lei como un 75%:

- Lo que ya veo claro: identidad/expediente, seguimiento (canvas, objetivos, actividades, evidencias), comunicacion, informes y auditoria.
- Lo que dejo a medias: finanzas (los docs estan llenos de `TBD`), cronograma y la parte de evolucion/diagnostico (me choca con el prototipo, lo explico abajo).
- Lo que casi ni toque: Pre-incubacion, porque esta fuera del primer alcance y casi todo esta `TBD`.

Donde el doc funcional dice `TBD`, yo lo dejo `TBD`. No me puse ni a inventar estados, partidas ni campos obligatorios que no estan aun definidos.

## Convenciones que asumo (y por que)

- **PostgreSQL como unico motor y PK `id` uuid en todas.** Es lo que dicen los docs, no meto otro motor.
- **Todo cuelga de `entrepreneurship_id`** (directo o via `program_cycle_id`), porque la regla central es que el expediente es unico y persiste entre programas. De aca sale lo mas importante: **ninguna FK puede cruzar dos emprendimientos**.
- **`created_at` / `updated_at` casi en todo, y borrados logicos (`deleted_at`)**, ya que el doc insiste en que un registro historico no se borra ni se sobrescribe en silencio.
- **Nombres de tabla en snake_case**, y entre parentesis dejo la entidad tal cual aparece en el doc para no perder el hilo.
- **Los archivos no van en la fila:** viven en R2 y se referencian. Por eso mas abajo propongo una tabla `document`.

---

## 1. Identidad y expediente


### user  (doc: User)
- Para que: la identidad de SIA. Clerk autentica, pero yo pongo el rol y la autorizacion en la base, porque el doc es claro en que Clerk no es fuente de verdad de permisos.
- Columnas: `id`, `clerk_user_id` (unico), `email`, `nombre`, `rol` (enum: Coordinadora | Gestor | Emprendedor | RevisorFinanciero), `estado` (activo/inactivo), `created_at`.
- Me falta: el rol RevisorFinanciero y su alcance estan `TBD` en el doc de roles.

### invitation  (doc: Invitation)
- Para que: el primer acceso exige una invitacion vigente ligada al mismo correo verificado, asi que la modelo aparte.
- Columnas: `id`, `email`, `rol`, `token` (unico), `invited_by` → user, `expires_at`, `used_at` (null = sin usar), `created_at`.

### entrepreneurship  (doc: Entrepreneurship)
- Para que: es el expediente unico y la raiz de casi todo el modelo.
- Columnas: `id`, `nombre`, `estado`, `perfil` (?), `created_at`.
- Me falta: los campos obligatorios del perfil y los estados estan `TBD`.

### program_enrollment  (doc: ProgramEnrollment)
- Para que: guardar la participacion historica en cada programa. Un emprendimiento pasa por varios y no quiero perder nada.
- Columnas: `id`, `entrepreneurship_id`, `programa` (enum: pre_incubacion | prototipado | puesta_en_marcha), `estado`, `fecha_ingreso`, `fecha_salida`, `motivo_salida`.
- Me falta: los estados y las reglas de transicion entre programas estan `TBD`.

### program_cycle  (doc: ProgramCycle)
- Para que: el ciclo o proyecto concreto dentro de una inscripcion (por ejemplo, un proyecto financiado de Prototipado).
- Columnas: `id`, `program_enrollment_id`, `nombre`, `tipo` (proyecto_financiado | intervencion), `estado`, `fecha_inicio`, `fecha_fin`.

### assignment  (doc: relaciones N:M gestores/emprendedores)
- Para que: ligar usuarios con el emprendimiento o el ciclo. Gestores asignados y emprendedores autorizados.
- Columnas: `id`, `user_id`, `entrepreneurship_id`, `program_cycle_id` (nullable), `relacion` (gestor | emprendedor), `assigned_by`, `assigned_at`.
- Aca dudo: el doc dice "emprendimiento **o** ciclo segun corresponda". Todavia no me decido si dejarlo con `cycle_id` nullable (como aqui) o partirlo en dos tablas. Lo dejo abierto.

---

## 2. Seguimiento (canvas, plan de trabajo, evidencias)


### program_canvas  (doc: ProgramCanvas)
- Para que: el canvas versionado por programa. Guardo la version porque el doc quiere poder comparar la evolucion.
- Columnas: `id`, `programa`, `version`, `estado`, `vigente` (bool), `created_at`.
- Me falta: las areas oficiales estan `TBD` en cada programa.

### canvas_area  (doc: CanvasArea)
- Para que: cada area del canvas. Las dejo como tabla porque el doc dice que las areas son extensibles.
- Columnas: `id`, `program_canvas_id`, `nombre`, `orden`, `descripcion`.

### deliverable  (doc: Deliverable)
- Para que: el entregable de un area. Le pongo su tabla porque hay una regla dura: no se marca completo sin desagregarlo en objetivos y actividades.
- Columnas: `id`, `canvas_area_id`, `nombre`, `obligatorio` (bool), `descripcion`.
- Me falta: la definicion, obligatoriedad y evidencia minima estan `TBD`.

### objective  (doc: Objective)
- Para que: el objetivo del plan. Ojo con la logica: un objetivo aprobado que cambia vuelve a pendiente de validacion, eso lo tengo que reflejar en el estado.
- Columnas: `id`, `entrepreneurship_id`, `program_cycle_id` (?), `deliverable_id` (?), `titulo`, `descripcion`, `estado` (pendiente_validacion | aprobado), `approved_by`, `approved_at`.

### activity  (doc: Activity)
- Para que: la ejecucion concreta de un objetivo. Es la que alimenta el cronograma y el Kanban.
- Columnas: `id`, `objective_id`, `titulo`, `responsable` → user, `fecha`, `estado` (por_hacer | en_progreso | en_revision | hecho), `autocompletar` (bool), `completed_at`.
- Me falta: los estados exactos y la condicion de autocompletado estan `TBD`. No llevo pesos manuales, el doc dice que el avance usa pesos iguales.

### evidence  (doc: Evidence)
- Para que: el respaldo de la actividad. Puede ser archivo, foto, video o enlace.
- Columnas: `id`, `activity_id`, `tipo` (archivo | imagen | video | enlace), `titulo`, `document_id` (→ document, si es archivo) o `url` (si es enlace), `autor`, `fecha`.
- Me falta: los limites de tamano y MIME estan `TBD`.

### schedule_item  (doc: ScheduleItem)
- Para que: la actividad o hito que se ve en el cronograma.
- Columnas: `id`, `entrepreneurship_id`, `activity_id` (?), `titulo`, `tipo` (actividad | hito), `inicio`, `fin`, `estado`.
- Aca dudo: capaz ni la hago tabla y la derivo de `activity`. Tengo que ver si vale la pena materializarla.

### validation  (doc: Validation)
- Para que: registrar cada decision de validacion (aprobar, pedir correccion o rechazar) con su trazabilidad.
- Columnas: `id`, `entidad_tipo` (objetivo | actividad | hito | entregable | informe), `entidad_id`, `validador` → user, `decision`, `observacion`, `fecha`.
- Aca dudo: la puse polimorfica, pero no me decido si dejarla asi o hacer una validacion por tipo de entidad. Los criterios por programa estan `TBD`.

### evolution_snapshot  (doc: EvolutionSnapshot)
- Para que: un momento o version comparable del emprendimiento para ver la evolucion.
- Columnas: `id`, `entrepreneurship_id`, `program_canvas_id`, `tipo` (inicial | seguimiento | cierre), `fecha`, `autor`.
- **Esto me hace ruido:** el prototipo (`visual/prototype/src/data/types.ts`) ya modela esto como `Diagnostic` + `Assessment` + `Need` + `Ambition`, que es mucho mas rico que el `EvolutionSnapshot` del doc. Antes de modelar en serio hay que decidir cual gana. Para mi es el pendiente mas grande de todo el borrador.

---

## 3. Comunicacion (reuniones, minutas, canales)

Esta parte es el reemplazo de Teams mas el registro de las reuniones externas.

### meeting  (doc: Meeting)
- Para que: la reunion pasa en Zoom o Meet; SIA solo guarda la referencia y el contexto. No guardo grabaciones, el doc las descarta por costo.
- Columnas: `id`, `entrepreneurship_id`, `program_cycle_id` (?), `titulo`, `fecha`, `enlace_referencia`, `created_by`.
- Me falta: definir como guardo participantes (tabla puente o lista), esta `TBD`.

### meeting_minutes  (doc: MeetingMinutes)
- Para que: la minuta. Puede ser manual o borrador de IA, pero si es de IA siempre pasa por revision humana antes de publicar.
- Columnas: `id`, `meeting_id`, `contenido`, `origen` (manual | ia_borrador), `estado` (borrador | publicada), `revisado_por`, `published_at`.

### agreement  (doc: Agreement)
- Para que: el acuerdo que sale de la reunion, con su responsable y fecha.
- Columnas: `id`, `meeting_id`, `descripcion`, `responsable` → user, `fecha_compromiso`, `estado`.

### meeting_action  (doc: MeetingAction)
- Para que: el proximo paso concreto. Me da la impresion de que se solapa con `agreement`; tengo que decidir si son lo mismo o no.
- Columnas: `id`, `meeting_id`, `descripcion`, `responsable`, `fecha`, `estado`.

### channel  (doc: Channel)
- Para que: cada emprendimiento o ciclo tiene al menos canales de reuniones, finanzas y consultas generales.
- Columnas: `id`, `entrepreneurship_id`, `program_cycle_id` (?), `tipo` (reuniones | finanzas | general), `nombre`.
- Me falta: la taxonomia final y los permisos por canal estan `TBD`.

### channel_message  (doc: ChannelMessage)
- Para que: el mensaje del chat. Editar o borrar es visual, pero deja auditoria de actor y fecha.
- Columnas: `id`, `channel_id`, `autor` → user, `contenido`, `created_at`, `edited_at`, `deleted_at`.

### chat_attachment  (doc: ChatAttachment)
- Para que: el adjunto privado del mensaje.
- Columnas: `id`, `channel_message_id`, `document_id` → document, `nombre`, `mime`, `tamano`.

### chat_mention  (doc: ChatMention)
- Para que: las menciones, que despues disparan notificacion.
- Columnas: `id`, `channel_message_id`, `mentioned_user_id`.

### chat_read_receipt  (doc: ChatReadReceipt)
- Para que: poder calcular los no leidos por usuario.
- Columnas: `id`, `channel_id`, `user_id`, `last_read_message_id` (o `last_read_at`).

---

## 4. Notificaciones y alertas

Las separo a proposito porque para mi no son lo mismo. Segun entiendo, la alerta es el evento de negocio pendiente; la notificacion es la entrega al usuario.

### alert  (doc: Alert)
- Para que: avisar de un seguimiento, validacion, acuerdo, actividad, entregable, presupuesto o informe pendiente, siempre respetando el alcance del usuario.
- Columnas: `id`, `tipo`, `entrepreneurship_id`, `program_cycle_id` (?), `destinatario` → user, `created_at`, `resolved_at`.
- Me falta: la periodicidad, el escalamiento y el criterio de cierre estan `TBD`.

### notification  (doc: Notification)
- Para que: lo que ve el usuario dentro de la app y, cuando toca, el correo por Resend.
- Columnas: `id`, `user_id`, `tipo`, `entidad_tipo`, `entidad_id`, `canal` (in_app | email), `sent_at`, `read_at`.

---

## 5. Finanzas (por programa — hoy solo Prototipado la habilita)

Aviso: esta es la parte mas verde. El doc de finanzas esta lleno de `TBD` y Puesta en marcha ni siquiera define aun su relacion con presupuesto. Asi que lo dejo tentativo NO en firme.

### budget  (doc: presupuesto)
- Para que: el presupuesto aprobado del ciclo o proyecto.
- Columnas: `id`, `program_cycle_id`, `estado`, `moneda` (?), `total`.

### budget_item  (doc: partida)
- Para que: la partida del presupuesto. Se ve asignado, ejecutado, disponible y % consumido.
- Columnas: `id`, `budget_id`, `nombre`, `monto_asignado`.
- Yo creo que `ejecutado`, `disponible` y `%` no los guardo, los **calculo** desde compras y facturas. La lista oficial de partidas esta `TBD`.

### purchase  (doc: compra)
- Para que: el flujo solicitud → cotizacion → revision → factura → pago. Descuenta la partida.
- Columnas: `id`, `budget_item_id`, `descripcion`, `monto`, `estado`, `solicitante` → user, `created_at`.
- Me falta: el flujo exacto, los estados y los responsables estan `TBD`.

### invoice  (doc: factura)
- Para que: la factura de una compra. Hay que evitar cargarla dos veces entre plataformas.
- Columnas: `id`, `purchase_id`, `numero`, `monto`, `fecha`, `document_id` → document, `estado_pago`.
- Me falta: la integracion con el sistema administrativo esta `TBD` (capaz ni es viable).

### budget_change  (doc: cambio presupuestario)
- Para que: mover fondos o ajustar. Requiere revision o aprobacion y deja rastro.
- Columnas: `id`, `budget_id`, `tipo`, `monto`, `item_origen`, `item_destino`, `solicitado_por`, `aprobado_por`, `estado`, `fecha`.
- Me falta: las reglas para mover fondos entre partidas estan `TBD`. Y nunca se aprueba con IA.

---

## 6. Informes tecnicos

El informe periodico (arranca mensual) que reutiliza los datos del periodo. La clave: la version aprobada es inmutable.

### technical_report  (doc: TechnicalReport)
- Para que: el informe como contenedor. Identifica emprendimiento, ciclo, periodo y tipo.
- Columnas: `id`, `entrepreneurship_id`, `program_cycle_id` (?), `periodo_inicio`, `periodo_fin`, `tipo` (seguimiento | cierre).
- Me falta: la plantilla y los campos obligatorios del informe mensual estan `TBD`.

### technical_report_version  (doc: TechnicalReportVersion)
- Para que: cada version. Una correccion crea una version nueva vinculada y no toca la aprobada. El PDF sale solo despues de aprobar.
- Columnas: `id`, `technical_report_id`, `version` (int), `estado` (borrador | aprobado), `author`, `approved_by`, `approved_at`, `supersedes_version_id`.

### technical_report_source_reference  (doc: TechnicalReportSourceReference)
- Para que: la trazabilidad. Cada contenido apunta a su fuente real (objetivo, actividad, evidencia, minuta, acuerdo o dato financiero).
- Columnas: `id`, `version_id`, `entidad_tipo`, `entidad_id`, `descripcion`.

### technical_report_manual_entry  (doc: TechnicalReportManualEntry)
- Para que: lo que se escribe a mano en el informe. Lo que falte se muestra como "Pendiente de completar".
- Columnas: `id`, `version_id`, `seccion`, `contenido`, `autor`.

### technical_report_document  (doc: TechnicalReportDocument)
- Para que: el PDF ya generado y guardado privado.
- Columnas: `id`, `version_id`, `document_id` → document, `generado_at`.

---

## 7. Auditoria e infraestructura

### audit_log  (doc: AuditLog)
- Para que: el rastro de todo lo sensible. Registra al menos aprobaciones, cambios de objetivos aprobados, movimientos de presupuesto, validaciones, cierres, mensajes editados o borrados, y emision de informes.
- Columnas: `id`, `actor` → user, `entidad_tipo`, `entidad_id`, `accion`, `datos_antes` (jsonb), `datos_despues` (jsonb), `created_at`.

### document  (transversal — esto lo propongo yo, no esta explicito en el doc)
- Para que: centralizar los archivos privados de R2 en vez de repetir columnas de archivo en evidence, invoice, attachment e informe. Todos referencian aca.
- Columnas: `id`, `entrepreneurship_id`, `storage_key` (R2), `nombre`, `mime`, `tamano`, `uploaded_by`, `created_at`.
- Es decision de diseno mia. Si se prefiere, cada tabla se guarda su propio archivo, pero yo lo unificaria.

### job_queue  (infra — worker)
- Para que: el doc dice PostgreSQL como cola persistente, asi que aca viven las tareas del worker (minutas IA, correo, alertas, PDF), idempotentes.
- Columnas: `id`, `tipo`, `payload` (jsonb), `estado`, `intentos`, `run_at`, `locked_at`, `idempotency_key`.
- Es infraestructura, no dominio. Capaz la dejo en su propio esquema.

---

## Que falta para cerrar el borrador


1. **EvolutionSnapshot vs Diagnostic/Need/Ambition del prototipo.** Es el conflicto mas grande. Queda definir el modelo real de evolucion antes de dibujar nada.
2. **Grano emprendimiento vs ciclo.** Varias tablas (assignment, objective, channel, alert...) pueden colgar de uno o del otro. Hay que fijar la regla.
3. **Validation** polimorfica o una tabla por tipo.
4. **schedule_item** como tabla real o vista derivada de activity.
5. **Finanzas**: casi todo `TBD` (partidas oficiales, flujo de compras, estados, integracion administrativa). No lo modelo en firme hasta que el doc lo cierre.
6. **document** unificado si o no.
7. **Rol RevisorFinanciero** y su separacion respecto a Coordinadora/Gestor.

Y sobre todo, **me falto meterme a fondo en la carpeta `01-pre-incubacion`**. La pase por encima a proposito porque esta fuera del primer alcance y casi todo esta `TBD`, pero cuando ese programa entre en juego hay que volver ahi a sacar sus canvas, entregables y reglas.

Este archivo queda pendiente a otra revisión.
