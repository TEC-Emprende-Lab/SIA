# Requerimientos no funcionales

## Seguridad

### NFR-SEC-001

Todo tráfico de producción debe utilizar HTTPS.

### NFR-SEC-002

Los permisos deben validarse en backend.

### NFR-SEC-003

Los archivos privados no deben quedar accesibles mediante URLs públicas permanentes sin autorización.

### NFR-SEC-004

Los tokens de invitación deben ser aleatorios, tener expiración y quedar invalidados después de usarse.

### NFR-SEC-005

Los adjuntos del chat deben almacenarse de forma privada. Los archivos no seguros deben descargarse sin ejecutarse ni previsualizarse automáticamente.

### NFR-SEC-006

FastAPI debe validar en cada solicitud autenticada la firma, emisor, audiencia y vigencia del JWT emitido por Clerk antes de aplicar autorización de SIA.

### NFR-SEC-007

El sistema debe aplicar rate limiting distribuido mediante Redis a endpoints sensibles o costosos, al menos autenticación/activación, invitaciones, mensajes de chat, carga de archivos y generación de minutas.

Al exceder un límite, FastAPI debe responder con `429 Too Many Requests` sin registrar ni ejecutar la acción solicitada.

---

## Privacidad

### NFR-PRI-001

Los usuarios solo deben acceder a información correspondiente a su rol y proyectos.

### NFR-PRI-002

La política de retención de grabaciones y transcripciones está `TBD`.

---

## Usabilidad

### NFR-UX-001

La interfaz debe ser simple y entendible para personas con distintos niveles de experiencia tecnológica.

### NFR-UX-002

Las acciones principales deben requerir pocos pasos.

### NFR-UX-003

Los estados y alertas deben mostrarse con lenguaje comprensible.

---

## Trazabilidad

### NFR-AUD-001

Registrar actor y fecha en acciones relevantes, al menos:

- aprobación de objetivos;
- modificación de objetivos aprobados;
- envío a FUNDATEC y aprobación de trámites financieros;
- cambios relevantes de presupuesto;
- finalización de proyectos.

---

## Rendimiento

Objetivos de rendimiento concretos están `TBD`.

Como línea base, las vistas principales deberían responder de forma interactiva bajo carga normal esperada para una incubadora de 15–20 proyectos nuevos por año.

---

## Disponibilidad

SLA formal: `TBD`.

---

## Mantenibilidad

- arquitectura modular;
- convenciones consistentes;
- validaciones centralizadas;
- evitar lógica de negocio duplicada;
- documentación actualizada;
- pruebas para reglas críticas.

## Diagnóstico evolutivo

### NFR-AUD-002

El sistema debe auditar creación, envío, aprobación, archivo y creación de revisiones de diagnósticos; cambios de estado y cierre de necesidades; y vínculos de ambiciones con objetivos. Debe registrar actor, fecha, entidad y datos relevantes antes y después cuando aplique.

### NFR-PRI-003

Las comparaciones, necesidades, evidencias contextuales y respuestas de diagnóstico se rigen por el acceso al proyecto. Los indicadores transversales solo se exponen a la Coordinadora.

### NFR-PER-001

Las consultas de historial y dashboard deben obtener únicamente los diagnósticos, áreas y relaciones necesarios, con paginación para historiales extensos.

## Informes técnicos

### NFR-AUD-003

El sistema debe auditar la creación, envío, aprobación, emisión, archivado y creación de versiones de informes; además de las fuentes seleccionadas, entradas manuales, generación de PDF y adjuntos firmados.

### NFR-SEC-008

Los PDFs y versiones firmadas de informes se almacenan de forma privada en R2 y se entregan solo mediante autorización backend y URLs firmadas de duración limitada.

### NFR-PER-002

La recopilación y PDF de un informe se ejecutan como tarea persistente del worker después de la aprobación. La operación debe ser idempotente por versión y no bloquear la solicitud interactiva.
