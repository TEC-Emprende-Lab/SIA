# Lineamientos UI/UX

## Principios

- Interfaz minimalista.
- Evitar saturación de información.
- Priorizar estado, acciones pendientes y avance.
- Lenguaje no técnico.
- Mantener navegación consistente.
- Reducir profundidad de navegación.

## Dashboard de Coordinadora

Debe priorizar:

1. proyectos activos;
2. proyectos finalizados;
3. alertas;
4. indicadores globales;
5. accesos rápidos a proyectos.

Las métricas exactas están `TBD`.

## Vista de proyecto

Debe ofrecer acceso claro a:

- Resumen
- Objetivos
- Actividades
- Evidencias
- Reuniones
- Minutas
- Trámites financieros
- Presupuesto
- Gastos
- Alertas
- Diagnósticos 360°, necesidades y ambiciones
- Informes

No necesariamente todos deben ser pestañas independientes; la arquitectura visual está `TBD`.

## Estados

Los estados importantes deben distinguirse visualmente, por ejemplo:

- pendiente;
- aprobado;
- completado;
- alerta;
- finalizado.

No depender únicamente de color para transmitir significado.

## Formularios

- pedir solo información necesaria;
- mensajes de error específicos;
- validar campos antes de enviar cuando sea razonable;
- conservar información introducida si ocurre un error recuperable.

## Público

El sistema será utilizado por usuarios con niveles heterogéneos de experiencia tecnológica.

Por ello se debe evitar:

- terminología interna sin explicación;
- acciones ocultas;
- menús excesivamente profundos;
- flujos que requieran memorizar procesos.

## Chat del proyecto

- Un único chat general visible dentro de cada proyecto.
- Mostrar claramente mensajes no leídos, menciones y adjuntos.
- Identificar visualmente los mensajes eliminados sin mostrar su contenido original.
- Mantener las conversaciones de chat separadas del historial formal de los trámites financieros.

## Objetivos y actividades

- El módulo debe ofrecer una vista Kanban por proyecto para consultar y gestionar objetivos y actividades visualmente.
- Las columnas deben representar estados de trabajo; su definición exacta debe respetar los estados funcionales aprobados.
- Cada tarjeta debe identificar su objetivo, actividad, responsable cuando aplique, fecha relevante, evidencias y estado.
- El Kanban complementa la vista jerárquica objetivo → actividad; no reemplaza el cálculo de avance ni los flujos de aprobación.

## Finanzas y compras

- Presupuesto, trámites, gastos derivados y reportes financieros deben vivir en un único módulo por proyecto.
- La vista inicial debe responder cuatro preguntas sin navegación adicional: cuánto presupuesto hay, cuánto está aprobado, cuánto está en proceso y cuánto está disponible.
- Las solicitudes de compra, pago o reintegro deben estar accesibles desde el mismo módulo, con filtros por estado, tipo y fecha.
- Los reportes financieros se presentan como una vista secundaria del módulo, sin separar los datos de su contexto presupuestario.

## Diagnóstico 360°, necesidades y ambiciones

- La vista de proyecto debe presentar Diagnóstico 360° como un módulo visible junto al seguimiento existente.
- Cada área se representa en un bloque con icono, color consistente, nombre, pregunta guía, nivel de avance, resumen de necesidades abiertas y una acción para abrir el detalle.
- El diagnóstico no debe ser un formulario extenso de una sola pantalla: las áreas se completan por bloques o pasos y se conserva el borrador ante errores recuperables.
- La comparación debe presentar claramente calificación anterior, actual y cambio; además del color, debe usar texto o iconografía para avance, estancamiento o retroceso.
- Crear ambición usa un modal o panel enfocado: tarjetas de tipo con icono, nombre y explicación breve; y solo los campos aplicables al tipo seleccionado.
- La pantalla de necesidad debe mostrar objetivo, actividades, evidencias, reuniones, resultado y evolución posterior del área sin declarar una necesidad atendida automáticamente.

## Informes técnicos

- La vista de proyecto debe incluir Informes como acceso de primer nivel junto a los módulos de seguimiento.
- Crear informe usa un flujo enfocado: tipo y período, revisión de fuentes, redacción y anexos, revisión y estado de emisión.
- Cada sección muestra sus fuentes seleccionadas mediante enlaces al registro original y señala ausencias con `Pendiente de completar`.
- La edición de borrador solo cambia la redacción del informe; no debe presentar controles que alteren los registros fuente.
- El historial muestra número de versión, período, estado, autor, aprobador y fecha. Las versiones aprobadas son de solo lectura y ofrecen descargar PDF; la versión firmada se identifica de forma clara cuando exista.
- La vista muestra la próxima fecha de informe configurada y una alerta de preparación vencida, pero mantiene la creación del informe como acción explícita del Gestor o Coordinadora.
