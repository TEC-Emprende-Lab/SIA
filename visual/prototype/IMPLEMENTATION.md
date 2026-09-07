# Mockup Catalitec: seguimiento evolutivo

Implementación frontend de US-022 y US-024–030, con el plan de trabajo de US-006–011. El nombre visible Catalitec responde a la solicitud del mockup; no modifica la decisión pendiente sobre el nombre final del sistema. Se conserva la marca gráfica y la paleta de `visual/brand/`.

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

1. En Diagnóstico 360°, seleccionar Nuevo diagnóstico. Completar contexto y las ocho áreas. Guardar borrador, enviar a revisión y confirmar aprobación.
2. Abrir un área del diagnóstico y seleccionar Detectar necesidad. Registrar prioridad, descripción y responsable.
3. Desde el detalle de la necesidad, crear una ambición. Elegir entre sueño, visión, propósito, ambición, objetivo, meta, hito y proyecto. El tipo Objetivo exige un vínculo con el plan operativo existente.
4. En Objetivos y actividades, crear un objetivo pendiente y aprobarlo como Gestor o Coordinadora, o reutilizar uno existente. Crear una actividad, agregar evidencia y completarla.
5. Volver a la necesidad: los vínculos reflejan el trabajo, pero su estado sigue pendiente de validación. Revisar su estado y respaldar el cierre con una evidencia vinculada o diagnóstico aprobado posterior.
6. En Evolución, comparar fotografías aprobadas consecutivas. La tabla muestra valores anterior y actual, diferencia y dirección del cambio.
7. En Informes, elegir tipo y período, seleccionar fuentes, revisar la vista previa y guardar el borrador. Editar redacción con respaldo, enviar, aprobar y crear una nueva versión para correcciones.

La configuración junto al perfil permite simular Coordinadora, Gestor y Emprendedor, estados vacíos, carga y un error en el siguiente guardado. Un error conserva el formulario para reintentar. La búsqueda global conecta secciones, necesidades, objetivos, ambiciones y evidencias. La navegación por fragmentos permite enlaces internos y atrás/adelante del navegador.

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
| US-024; AC-028–030; BR-020–021 | Ocho áreas, notas, calificación entera 1–5, borrador, envío, aprobación, revisión enlazada e instantáneas del catálogo. La administración real del catálogo queda fuera de esta entrega visual. |
| US-025; AC-029; BR-020 | Comparación cronológica de aprobados: avance, estancamiento y retroceso. Sin inferir causalidad. |
| US-026; AC-031–032; BR-022 | Necesidades vinculadas N:M a objetivos, con recorrido a ambiciones, actividades, evidencias y reuniones. Cierre explícito con justificación y respaldo. |
| US-027; AC-033; BR-023 | Ocho tipos, campos condicionales, objetivos reutilizados, sin duplicar avance. |
| US-006–011; AC-003–004, 008–010 | Crear/aprobar/editar objetivos; la edición invalida aprobación. Kanban y lista; completar actividad registra fecha; evidencias simuladas. |
| US-028; AC-035, 038; BR-025, 027–028 | Período, fuentes seleccionadas, línea base anterior, narrativa determinista, impactos y campos sin respaldo como Pendiente de completar. Redacción manual con referencias. |
| US-029–030; AC-036–037; BR-025–026 | Revisión, aprobación, instantánea inmutable y nueva versión enlazada. Impresión de la vista aprobada como copia de demostración. No se simula una emisión institucional ni firma real. |
| AC-039; BR-029 | Se muestra próxima preparación configurada; no se crean informes automáticamente. |
| AC-034; BR-024 | Selector de roles de demostración sobre el mismo proyecto. Controles y comandos limitan acciones según rol; no equivalen a autorización real. |

Los archivos de evidencia se representan mediante referencias y descripciones; no se suben ni persisten binarios. No hay generación IA, PDFs institucionales, archivos firmados ni notificaciones externas. Las vistas de reuniones/minutas, finanzas y equipo son consultas con detalle; el chat solo agrega mensajes locales. Los módulos operativos completos, la autorización backend, la persistencia y la emisión de documentos siguen pendientes para la aplicación real.

Las acciones del mockup registran actor, fecha y estado anterior/posterior en memoria. Las fechas de la demostración usan el 7 de septiembre de 2026 como referencia reproducible. Todos los datos son ficticios, incluidos los textos de evidencia y las cifras financieras.

La rama `feature/mockup-seguimiento-evolutivo` conserva los cambios documentales previos del usuario. No había una referencia local o remota `develop` al iniciar; se partió del checkout existente y no se publicó ni fusionó ningún cambio.
