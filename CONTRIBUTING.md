# Guía de contribución

## Antes de empezar

1. Revisar `AGENTS.md` y la documentación funcional aplicable.
2. Confirmar la User Story, regla de negocio y criterio de aceptación relacionados con el cambio.
3. Crear la rama desde `develop`.

## Ramas

Usar nombres cortos y descriptivos:

```text
feature/chat-proyecto
fix/autorizacion-tramites
docs/modelo-entregables
chore/ci-prototipo
```

- `develop`: integración y staging.
- `main`: producción.
- No hacer push directo a `develop` ni `main`.

## Commits

Usar Conventional Commits:

```text
feat(finanzas): add project finance summary
fix(chat): restrict mentions to project members
test(tramites): cover approved procedure immutability
docs(ui): document activity Kanban view
chore(ci): add prototype quality check
```

## Pull requests

Abrir pull request hacia `develop`. Debe incluir:

- objetivo del cambio y User Story asociada cuando aplique;
- reglas de negocio afectadas;
- migraciones, si existen;
- pruebas ejecutadas;
- impacto en permisos, seguridad, rendimiento o datos históricos;
- actualización de documentación cuando cambie comportamiento o alcance.

Un pull request hacia `main` se crea únicamente desde `develop` para liberar una versión validada en staging.

## Calidad mínima

Antes de abrir un pull request, ejecutar las verificaciones aplicables. Para el prototipo actual:

```bash
cd prototype
pnpm install
pnpm lint
pnpm build
```

La aplicación real deberá añadir pruebas unitarias, integración y end-to-end conforme a `docs/12_DEVELOPMENT_WORKFLOW.md`.

## Reglas de datos y seguridad

- Nunca incluir secretos, tokens, archivos `.env` o datos de producción.
- Toda autorización debe validarse en backend.
- No sobrescribir ni eliminar historial relevante silenciosamente.
- No ampliar el MVP ni inventar reglas de negocio sin documentarlo y aprobarlo.
