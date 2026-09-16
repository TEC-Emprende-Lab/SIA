# Prototipo visual de Catalitec / SIA

Mockup responsive y navegable de Lumen Biotech con diagnóstico evolutivo e informes técnicos. Usa datos ficticios y no se conecta a autenticación, base de datos ni servicios externos.

**Estado revisado — 2026-09-16:** la API persistente ya existe por separado; esta demo conserva estado local y sus escalas/estados no definen las reglas de programa pendientes. Consultar la [matriz canónica](../../README.md#estado-actual) y la [evidencia CI](../../docs/operacion-api.md#evidencia-vigente--2026-09-16). UI real conectada y staging siguen sin completar/verificar, respectivamente.

## Ejecutar localmente

Desde `visual/prototype`, usar Node 24 y pnpm 9.15.9. Instalar con el lockfile propio fuera del workspace raíz; `--ignore-workspace` reproduce la corrección de CI de `a5f1796`.

```bash
pnpm install --frozen-lockfile --ignore-workspace
pnpm dev
```

## Construir

```bash
pnpm build
```

## Archivo autónomo

`bundle.html` contiene una versión autocontenida para abrir en un navegador sin ejecutar el proyecto.

## Alcance actual

- Dashboard de Coordinadora.
- Navegación simulada de un proyecto.
- Resumen, objetivos y actividades con Kanban, reuniones, finanzas y compras, documentos y entregables, chat, alertas y equipo.
- Paleta institucional y marca SIA.

- Diagnóstico 360° de Prototipado por seis áreas, creación/revisión/aprobación simulada, historial y comparación evolutiva.
- Ambiciones visibles con ocho tipos; cada objetivo pertenece a un área y puede vincular una ambición opcional.
- Objetivos aprobables, actividades completables y evidencias en estado local.
- Informes técnicos por período, selección de fuentes, vista previa, borradores, revisión y versiones inmutables. La impresión es una copia de demostración; no se emiten PDFs institucionales.
- Selector de roles de demostración, búsqueda, estados vacíos/carga/error y confirmaciones.

Ver [IMPLEMENTATION.md](IMPLEMENTATION.md) para el recorrido completo, arquitectura, pruebas, trazabilidad y límites del mockup.

```bash
pnpm lint
pnpm test
pnpm build
```

El build actualiza también `bundle.html`. Recargar restaura el seed; no hay almacenamiento ni conexiones externas.

## Coolify

Despliegue mediante el `Dockerfile` de la raíz del repositorio, con Nginx en el puerto 8080. Ver [configuración, validación y operación](../../deploy/coolify/README.md).
