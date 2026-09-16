# Recursos visuales de SIA

## `brand/`

Recursos institucionales de marca: logo y paleta oficial.

## `architecture/`

Recursos de arquitectura: `sia-architecture.json` (especificación del diagrama de arquitectura objetivo) y `asistenciaProyecto_v3.excalidraw` (diagrama C4 editable en Excalidraw).

## `prototype/`

Mockup navegable para validar navegación, jerarquía visual y experiencia de SIA. Al **2026-09-16** ya existe un núcleo backend independiente; la demo no se conecta a él. Consultar la [matriz canónica](../README.md#estado-actual) y el [README del prototipo](prototype/README.md).

El prototipo debe incorporar de forma visual el Diagnóstico 360° por programa, los objetivos por área y las ambiciones opcionalmente vinculables; sigue siendo un mockup sin persistencia ni permisos reales.

También debe representar Informes como una vista del proyecto con fuentes, estado de revisión, versiones y PDF, sin simular persistencia o aprobaciones reales.

```bash
cd visual/prototype
pnpm install --frozen-lockfile --ignore-workspace
pnpm dev
```
