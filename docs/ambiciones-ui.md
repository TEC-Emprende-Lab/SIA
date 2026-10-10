# Ambiciones: explorador estratégico

Trazabilidad: US-PRO-006 y reglas de [objetivos, actividades y evidencias](00-nucleo-comun/objetivos-actividades-evidencias.md). En Puesta en marcha conserva el vínculo opcional del núcleo común (US-PM-001).

La pantalla permite seleccionar una ambición, leer su descripción íntegra, editarla y abrir sus objetivos del ciclo actual. La búsqueda incluye título y descripción; el filtro distingue ambiciones con y sin objetivos en este ciclo. El selector móvil y los controles anterior/siguiente ofrecen las mismas ambiciones que la lista de escritorio.

Los estados y actividades mostrados pertenecen a los objetivos, no a la ambición. No se calcula un porcentaje, ni se añaden estados o prioridades a las ambiciones. Una ambición sin objetivos sigue siendo válida; los objetivos sin ambición no se agregan a otra. Se conservan los endpoints existentes, autorización backend, revisión optimista, historial y límites entre emprendimientos.

Verificación de aceptación: creación y edición mantienen `expected_revision` al editar; vínculos opcionales preservados; cada objetivo conserva su área, estado y navegación original; no se duplican actividades ni avance. Pruebas de render para contenido, estados vacíos, relaciones, contenido escapado y controles accesibles; revisión de escritorio y móvil y comprobación independiente del despliegue en staging.
