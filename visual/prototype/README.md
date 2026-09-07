# Prototipo visual de Catalitec / SIA

Mockup responsive y navegable de Lumen Biotech con diagnóstico evolutivo e informes técnicos. Usa datos ficticios y no se conecta a autenticación, base de datos ni servicios externos.

## Ejecutar localmente

```bash
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

- Diagnóstico 360° por ocho áreas, creación/revisión/aprobación simulada, historial y comparación evolutiva.
- Necesidades, cierre validado y ambiciones con ocho tipos, vinculadas al plan operativo.
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
