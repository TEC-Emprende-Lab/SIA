# Mockup Catalitec: seguimiento evolutivo

Implementación frontend de US-PRO-005 y US-PRO-006, con el plan de trabajo de US-PRO-001–004. El nombre visible Catalitec responde a la solicitud del mockup; no modifica la decisión pendiente sobre el nombre final del sistema. Se conserva la marca gráfica y la paleta de `visual/brand/`.

## Ejecutar y revisar

```bash
cd visual/prototype
pnpm install --frozen-lockfile
pnpm dev
```

Vite informa el puerto disponible (normalmente 5173). También se puede abrir `bundle.html` directamente, sin servidor ni conexión a internet.

```bash
pnpm lint
pnpm test
pnpm build
```

El build comprueba TypeScript, genera `dist/` y actualiza `bundle.html`. No se incorporaron dependencias de ejecución. La prueba de navegador usa Python Playwright, si está instalado:

```bash
python3 tests/browser.py http://127.0.0.1:5173/
```

## Recorrido de validación

1. En Diagnóstico 360°, seleccionar Nuevo diagnóstico. Completar contexto y las seis caras del Cubo 360 de Prototipado. Guardar borrador, enviar a revisión y confirmar aprobación.
2. En Ambiciones, registrar una aspiración visible, con o sin plazo y sin necesidad de vincularla a un objetivo.
3. En Objetivos y actividades, crear o editar un objetivo, seleccionar su área del Cubo 360 y, opcionalmente, una ambición. Aprobarlo como Gestor o Coordinadora; crear una actividad, agregar evidencia y completarla.
4. En Evolución, comparar fotografías aprobadas consecutivas. La tabla muestra valores anterior y actual, diferencia y dirección del cambio.
5. En Informes, elegir tipo y período, seleccionar fuentes, revisar la vista previa y guardar el borrador. Editar redacción con respaldo, enviar, aprobar y crear una nueva versión para correcciones.

La configuración junto al perfil permite simular Coordinadora, Gestor y Emprendedor, estados vacíos, carga y un error en el siguiente guardado. Un error conserva el formulario para reintentar. La búsqueda global conecta secciones, objetivos, ambiciones y evidencias. La navegación por fragmentos permite enlaces internos y atrás/adelante del navegador.

## Organización

| Archivo | Responsabilidad |
|---|---|
| `src/CatalitecApp.tsx` | Estructura, navegación y estado de sesión. |
| `src/state.ts` | Contrato de contexto y utilidades de presentación. |
| `src/ui.tsx` | Componentes compartidos, formularios, estados y diálogos accesibles. |
| `src/views/` | Vistas de diagnóstico, estrategia, trabajo, informes y espacio de proyecto. |
| `src/data/types.ts` | Tipos de entidades y relaciones. |
| `src/data/seed.ts` | Catálogo y datos ficticios consistentes de Lumen Biotech. |
| `src/data/repository.ts` | Repositorio asíncrono local, comandos, validaciones, cálculos, fuentes e instantáneas. |
| `tests/domain.mjs` | Reglas e invariantes sin navegador. |
| `tests/browser.py` | Recorrido integrado y comprobación responsive. |

`MockRepository.load()` y `execute(command, role)` devuelven `Promise<Store>`. Un adaptador futuro puede conservar el contrato mientras transforma comandos en llamadas a FastAPI; el contexto y los selectores evitan duplicar la lógica en las vistas. El repositorio de esta entrega conserva información solo en memoria; recargar restaura el seed. No hay fetch, endpoints, autenticación, base de datos, localStorage ni recursos remotos necesarios para la UI.

## Trazabilidad y límites

| Historias / aceptación | Representación y verificación |
|---|---|
| US-PRO-005 | Seis áreas de Prototipado, notas, calificación entera 1–5, borrador, envío, aprobación e instantáneas comparables. |
| US-PRO-006 | Ambiciones visibles sin objetivos obligatorios; un objetivo pertenece a un área y puede vincular una ambición sin duplicar avance. |
| US-PRO-001–002 | Crear/aprobar/editar objetivos; la edición invalida aprobación. Kanban y lista; completar actividad registra fecha; evidencias simuladas. |
| US-028; AC-035, 038; BR-025, 027–028 | Período, fuentes seleccionadas, línea base anterior, narrativa determinista, impactos y campos sin respaldo como Pendiente de completar. Redacción manual con referencias. |
| US-029–030; AC-036–037; BR-025–026 | Revisión, aprobación, instantánea inmutable y nueva versión enlazada. Impresión de la vista aprobada como copia de demostración. No se simula una emisión institucional ni firma real. |
| AC-039; BR-029 | Se muestra próxima preparación configurada; no se crean informes automáticamente. |
| AC-034; BR-024 | Selector de roles de demostración sobre el mismo proyecto. Controles y comandos limitan acciones según rol; no equivalen a autorización real. |

Los archivos de evidencia se representan mediante referencias y descripciones; no se suben ni persisten binarios. No hay generación IA, PDFs institucionales, archivos firmados ni notificaciones externas. Las vistas de reuniones/minutas, finanzas y equipo son consultas con detalle; el chat solo agrega mensajes locales. Los módulos operativos completos, la autorización backend, la persistencia y la emisión de documentos siguen pendientes para la aplicación real.

Las acciones del mockup registran actor, fecha y estado anterior/posterior en memoria. Las fechas de la demostración usan el 7 de septiembre de 2026 como referencia reproducible. Todos los datos son ficticios, incluidos los textos de evidencia y las cifras financieras.

La rama `feature/mockup-seguimiento-evolutivo` conserva los cambios documentales previos del usuario. No había una referencia local o remota `develop` al iniciar; se partió del checkout existente y no se publicó ni fusionó ningún cambio.

## Cubo 360 interactivo — US-PRO-005

Diagnóstico 360° utiliza `Cube360` con CSS 3D nativo, sin dependencias nuevas. El giro funciona con arrastre de mouse (Pointer Events, sensibilidad fija e inclinación limitada a ±90°) y con botones; un clic sin arrastre abre el detalle y evita el clic relicto tras un arrastre. No hay toques táctiles ni orientación por teclado; el teclado activa la evaluación desde cada cara como botón nativo. El catálogo `areas` conserva sus seis áreas; `Diagnostic.assessments` proporciona las calificaciones y `compareDiagnostics` los cambios entre fotografías aprobadas. La asignación visual de posiciones está aislada en `cubeFaces`: frente MVP, derecha modelo, atrás mercado, izquierda canales, superior identidad e inferior constitución. Evolución conserva su radar comparativo y tabla.

Recorrido adicional de aceptación (`tests/cube.py`, integrado en `tests/browser.py`):

1. Comprobar seis caras con ícono, nombre, nota y cambio; abrir cada detalle con Enter y recorrer botones con Tab y Espacio.
2. Arrastrar con mouse: rota el cubo, limita la inclinación a ±90° y no abre un detalle (captura sobre la cara y umbral de 6 px entre clic y arrastre). Un clic abre la evaluación actual.
3. Probar los cuatro controles de giro. Seleccionar una tarjeta orienta su cara al frente y abre el mismo detalle; las seis tarjetas siguen disponibles.
4. En contexto móvil, comprobar ausencia de overflow a 320, 390, 768 y 1024 px y abrir una cara por toque (sin arrastre táctil); con movimiento reducido no hay animaciones ni transiciones del cubo.

La iluminación se calcula desde la orientación de cada cara. No hay inercia ni rotación automática; la entrada usa una aparición breve y el giro solicitado tiene transición corta. Capturas del recorrido: `/tmp/catalitec-verification/cube-desktop.png` y `cube-mobile.png`.

## Ficha ampliada de cada cara — US-PRO-005 y US-PRO-001

Al seleccionar una cara o tarjeta se abre una ficha amplia con el color del área, selector de las seis áreas, calificación 1–5, diferencia respecto al diagnóstico aprobado anterior, pregunta y observación registrada. La historia presenta únicamente fotografías aprobadas del mismo proyecto hasta la fecha seleccionada. Se muestran autor, estado y aprobación; no se asignan etiquetas de madurez ni recomendaciones sin respaldo.

La sección «Del diagnóstico a la acción» consulta objetivos vinculados al área, sus estados, actividades completadas y cantidad de evidencias. Cada objetivo abre su plan filtrado. Esta sección se identifica explícitamente como trabajo actual, independiente de la fotografía histórica. Las áreas sin objetivos y las evaluaciones sin base aprobada tienen estados vacíos específicos.

Verificación: `pnpm test` (11 comprobaciones), `pnpm lint`, `pnpm build` y `tests/browser.py`. `tests/cube.py` comprueba cambios de área dentro del diálogo, calificaciones e historia, ausencia de evaluaciones futuras en la primera fotografía, objetivos correspondientes, apertura del plan, restauración del foco y ausencia de overflow interno a 320, 390 y 768 px. Capturas: `/tmp/catalitec-verification/area-detail-desktop.png` y `area-detail-mobile.png`. `Modal` cierra el diálogo nativo antes de restaurar el foco, para que el control de origen deje de ser inerte.

## Preparación de despliegue en Coolify

El `Dockerfile` de la raíz construye el prototipo con Node 24 y pnpm 9.15.9 y sirve `dist/` con Nginx en el puerto 8080. `.dockerignore` limita el contexto a los archivos necesarios, incluido el logo compartido. La configuración y el procedimiento se documentan en `deploy/coolify/README.md`; no se agregan servicios backend ni persistencia.

Validación local de la imagen `sia-prototype:coolify`: construcción desde cero con lockfile congelado, lint sin advertencias, 11 pruebas de dominio y build correctos; `nginx -t` correcto; estado Docker `healthy`; prueba HTTP de health, HTML, caché, assets, 404 y fallback correcta. Playwright ejecutó el recorrido completo sobre el contenedor en `http://127.0.0.1:18080/`, incluidas las fichas de área y móvil, sin errores de consola ni solicitudes externas. CI incluye la construcción de imagen y la prueba HTTP. El recurso remoto en Coolify no ha sido creado ni desplegado.
