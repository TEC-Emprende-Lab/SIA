# Estados de interacción de SIA

Patrones de interfaz de alcance transversal. No cambian acciones permitidas,
reglas de negocio, contratos ni auditoría.

## Decisiones que requieren confirmación

Usar `ConfirmAction` para una acción definitiva, publicación inmutable o pérdida
de cambios sin guardar. Nombrar el registro, explicar la consecuencia concreta y
usar el verbo de la acción en el botón. El foco inicial va a Cancelar. Escape
cancela sin guardar; durante el envío, no se puede cerrar el diálogo ni enviar
otra vez. Un error del servidor deja el diálogo abierto y conserva la observación.

El diálogo no reemplaza los requisitos del módulo: por ejemplo, observación y
revisión vigente al revocar una reunión o revisión humana al registrar ejecución.
La autorización y los conflictos se resuelven en la API.

## Carga y recuperación

- Primera consulta: `LoadingRows` para listas y tablas; `LoadingState` con
  `SkeletonBar` o `SkeletonRows` para conservar la distribución de vistas como
  calendario y presupuesto. Las formas son decorativas y solo se anuncia una
  etiqueta de carga por región.
- Cargar más: conservar las filas existentes y reservar espacio para el siguiente
  resultado. No confundir una consulta en curso con una lista vacía.
- Consultas independientes: mostrar la parte disponible y ofrecer un reintento
  para la parte que falló. No presentar una denegación como ausencia de datos.
- Actualizar datos de un mismo ámbito: si se conserva la última consulta en
  pantalla, distinguirla de los datos vigentes cuando la actualización falle.

Referencias: [Reuniones y minutas](00-nucleo-comun/reuniones-minutas-y-canales.md),
[Bandeja](00-nucleo-comun/notificaciones-y-alertas.md) y
[Finanzas de Prototipado, US-PRO-003 y US-PRO-007](02-prototipado/finanzas-operacion.md).
