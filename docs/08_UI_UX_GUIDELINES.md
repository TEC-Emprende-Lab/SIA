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
