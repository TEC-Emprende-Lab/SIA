# Replanteamiento de la plataforma tras la reunión

**Fecha de referencia:** 8 de septiembre de 2026  
**Estado:** decisiones para actualizar requerimientos; no sustituye la definición detallada de cada programa.

## 1. Cambio de enfoque

La plataforma deja de plantearse como un gestor genérico de objetivos y actividades. Su propósito será acompañar emprendimientos de forma asincrónica durante programas de incubación, conservando su expediente e historial al avanzar.

La arquitectura funcional se organizará en cuatro dominios documentales:

- Núcleo común de la plataforma.
- Pre-incubación.
- Prototipado.
- Puesta en marcha.

El desarrollo y la definición funcional inicial se concentrarán en **Prototipado** y **Puesta en marcha**. Pre-incubación queda documentada como programa futuro, sin incorporarse al primer alcance implementable.

## 2. Estructura propuesta de requerimientos

```text
docs/
├── 00-nucleo-comun/
├── 01-pre-incubacion/
├── 02-prototipado/
└── 03-puesta-en-marcha/
```

El núcleo común no debe contener entregables o reglas exclusivas de un programa. Cada programa debe definir, como mínimo:

1. Propósito y perfil de entrada.
2. Canvas, áreas y entregables.
3. Objetivos, actividades y evidencias.
4. Roles de validación y criterios para avanzar.
5. Reuniones, minutas e informe periódico aplicables.
6. Presupuesto, compras y restricciones financieras, cuando corresponda.
7. Criterios de salida.

## 3. Decisiones confirmadas

### 3.1 Expediente e historial

- Cada emprendimiento tendrá un expediente único e historial persistente.
- Pasar de un programa a otro no elimina lo registrado anteriormente.
- Un emprendimiento puede tener ciclos o proyectos específicos, por ejemplo un proyecto financiado de prototipado, además de objetivos generales.

### 3.2 Canvas y seguimiento

- Cada programa tendrá un canvas propio, con áreas, entregables, objetivos y actividades.
- Un entregable debe desagregarse; no basta marcar un tema amplio como completado.
- Las actividades deben poder alimentar un calendario o cronograma.
- Se debe poder consultar la evolución entre momentos o versiones del emprendimiento.

### 3.3 Validación y avance

- El emprendimiento registra sus avances, actividades y evidencias.
- Un gestor o persona con el rol correspondiente valida los hitos o entregables requeridos.
- La validación puede habilitar el avance al siguiente entregable, bloque o programa.
- Los objetivos aprobados no deben modificarse libremente; un cambio debe volver a validarse.

### 3.4 Reuniones y comunicación

- Las reuniones seguirán realizándose en herramientas externas, como Zoom o Meet.
- La plataforma debe registrar la reunión, su minuta, acuerdos, responsables y próximos pasos.
- No se prioriza almacenar grabaciones o videos de reuniones por su costo de almacenamiento.
- Cada proyecto debe contar con canales diferenciados, al menos para reuniones, compras/finanzas y consultas generales o técnicas.

### 3.5 Presupuesto, compras y facturas

- El presupuesto se organiza mediante partidas ya aprobadas y debe mostrar monto asignado, ejecutado, disponible y porcentaje consumido.
- Las compras y facturas deben descontar el presupuesto de la partida correspondiente.
- Los cambios presupuestarios deben quedar trazados y requerir revisión/aprobación.
- El emprendimiento debe visualizar su ejecución financiera para fomentar control propio del presupuesto.
- La factura no debe obligar a una carga duplicada entre plataformas.

### 3.6 Informes e inteligencia artificial

- Se requiere un informe técnico periódico, inicialmente mensual.
- El informe debe aprovechar objetivos, actividades completadas, evidencias, minutas, acuerdos y avances financieros registrados.
- La IA puede apoyar con borradores de minutas, detección de acuerdos, propuestas de próximos objetivos/actividades e informes.
- La IA no sustituye la aprobación humana de entregables, hitos, compras ni cambios presupuestarios.

## 4. Enfoque por programa

| Programa | Propósito | Salida esperada | Prioridad |
|---|---|---|---|
| Pre-incubación | Estructurar y validar la oportunidad, cliente y modelo de negocio. | Emprendimiento preparado para prototipar o aplicar a fondos. | Posterior |
| Prototipado | Construir y validar una solución/prototipo con usuarios o clientes. | Prototipo validado, con evidencia de pruebas y aprendizaje. | Inicial |
| Puesta en marcha | Convertir una solución validada en una operación comercial sostenible. | Emprendimiento listo para operar, vender y crecer. | Inicial |

Para ingresar a Puesta en marcha, se debe contar con modelo de negocio definido, prototipo validado y evidencia consistente de pruebas o aceptación de mercado.

## 5. Alcance inicial a definir primero

### Prototipado

- Canvas y entregables de desarrollo, prueba, validación y pilotaje.
- Objetivos, actividades, evidencias y validación por gestor.
- Cronograma/calendario.
- Seguimiento de presupuesto por partidas, compras y facturas.
- Minutas, acuerdos, alertas e informe técnico mensual.

### Puesta en marcha

- Canvas y entregables de preparación operativa y comercial.
- Objetivos, actividades, evidencias y validación por gestor.
- Cronograma, minutas, acuerdos, alertas e informes.
- Definición específica de su relación con presupuesto, compras y facturas.

## 6. Pendientes por definir antes de diseñar o implementar

1. Áreas, entregables obligatorios y criterios de salida de Prototipado.
2. Áreas, entregables obligatorios y criterios de salida de Puesta en marcha.
3. Qué entregables son obligatorios, opcionales o condicionados al tipo de emprendimiento.
4. Roles exactos y niveles de aprobación: coordinación, gestor, revisión financiera y emprendedor.
5. Lista oficial de partidas presupuestarias y reglas para mover fondos entre partidas.
6. Flujo exacto de solicitud de compra, cotización, factura, revisión y pago.
7. Punto de integración con el sistema administrativo actual para impedir duplicidad de carga de facturas.
8. Plantilla y campos obligatorios del informe técnico mensual.
9. Indicadores de progreso que se mostrarán en el dashboard.

## 7. Fuera del primer alcance

- Convocatoria, evaluación y selección de emprendimientos.
- Videollamadas internas y almacenamiento de grabaciones.
- Aprobaciones financieras o de entregables completamente automáticas mediante IA.
- Integración automática con el sistema administrativo mientras no se confirme su viabilidad técnica.
- Implementación completa de Pre-incubación.

