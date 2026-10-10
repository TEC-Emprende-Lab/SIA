# Diagnóstico 360: exploración visual

Trazabilidad: US-PRO-005 y US-PM-001. Se conservan las áreas oficiales del canvas fijado al ciclo, las observaciones del diagnóstico seleccionado, el historial, el envío a revisión y la inmutabilidad de fotografías aprobadas. No cambian permisos ni endpoints.

La vista reúne un cubo CSS 3D de seis caras y un lector de observaciones. La lista permite seleccionar cualquier área (incluida la inferior), enfoca su cara con el giro más corto y muestra el texto completo sin modal. Anterior/Siguiente recorren las áreas. La selección se reinicia al cambiar de fotografía para evitar mezclar observaciones.

El giro admite arrastre con ratón o toque, botones en ambos ejes, flechas de teclado con el escenario enfocado y tecla Inicio para restablecer. El arrastre supera un umbral de cinco píxeles antes de capturar el puntero; no selecciona caras al terminar. Se respeta `prefers-reduced-motion`. La opción Ampliar cambia el espacio asignado al cubo, no abre una ventana ni inicia rotación automática.

Los colores corresponden a las áreas, no a nivel de madurez. El contador incluye solo observaciones no vacías de áreas oficiales: no expresa progreso ni puntaje. No se introducen escalas numéricas pendientes de definición.

Validación: typecheck, lint, pruebas de renderizado del explorador y suites web existentes; revisión visual local aislada en escritorio y móvil, selección de las seis áreas, controles de giro, teclado, arrastre, reinicio, contenido largo y ausencia de desbordamiento horizontal. La fixture temporal no se publica ni reemplaza la autorización de SIA. La validación autenticada en staging es un paso separado.
