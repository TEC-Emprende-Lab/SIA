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

## AC-028 — Diagnóstico histórico

Un diagnóstico aprobado no puede modificarse. Una corrección debe crear una nueva revisión vinculada y el historial debe conservar ambos registros, actores y fechas.

## AC-029 — Evaluación y comparación

Cada evaluación de área debe aceptar solo calificaciones enteras de 1 a 5. Para dos diagnósticos aprobados consecutivos, la comparación muestra la calificación anterior, actual y su diferencia por área.

## AC-030 — Catálogo de áreas

Se pueden activar, desactivar o agregar áreas y preguntas guía sin cambiar la estructura de `Diagnostic` o `DiagnosticAssessment`. Un diagnóstico histórico conserva la instantánea de área y pregunta guía utilizada.

## AC-031 — Necesidad validada

Una actividad completada no marca automáticamente una necesidad como `ADDRESSED`. Solo Gestor asignado o Coordinadora puede validar el cierre, con justificación y respaldo registrado.

## AC-032 — Relaciones de necesidad

Una necesidad puede asociarse a múltiples objetivos y un objetivo a múltiples necesidades, siempre dentro del mismo proyecto. Los vínculos con actividades, evidencias y reuniones se pueden consultar desde la necesidad.

## AC-033 — Ambición sin duplicar objetivo

Una ambición de tipo `OBJECTIVE` debe enlazarse con al menos un objetivo operativo y no crear una segunda entidad que participe en los cálculos de avance. El objetivo operativo mantiene su flujo de aprobación.

## AC-034 — Permisos evolutivos

El Emprendedor solo puede crear, editar y enviar borradores de sus proyectos. Un Gestor no asignado no puede aprobar diagnósticos ni validar necesidades. La Coordinadora puede consultar indicadores transversales.

## AC-035 — Informe por período y fuentes

Un informe de seguimiento o cierre identifica proyecto y período. Cada contenido incluido tiene al menos una referencia a un registro del mismo proyecto o una entrada manual trazable con fuentes de respaldo; una ausencia se representa como `Pendiente de completar`.

## AC-036 — Congelamiento y versiones

Al aprobar un informe, el sistema conserva su instantánea de contenido y fuentes. Cambiar un objetivo, actividad, diagnóstico, necesidad o presupuesto después de aprobar no altera la versión aprobada. Corregirla crea una nueva versión vinculada.

## AC-037 — Revisión y PDF

Solo una Coordinadora o Gestor asignado puede aprobar una versión. No se puede generar ni descargar `ISSUED_PDF` antes de esa aprobación. El PDF y la versión firmada permanecen privados.

## AC-038 — Narrativa asistida

El borrador narrativo solo usa fuentes seleccionadas. No puede crear afirmaciones sin fuente; impactos, conclusiones, aprobaciones o causalidades que no cuenten con respaldo quedan como `Pendiente de completar`.

## AC-039 — Periodicidad sin emisión automática

Al vencerse la periodicidad configurada de un proyecto, se genera una alerta de preparación para Gestor y Coordinadora. No se crea, aprueba, congela ni emite un informe hasta que un usuario autorizado lo inicie y complete el flujo de revisión.
