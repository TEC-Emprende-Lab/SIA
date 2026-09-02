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
