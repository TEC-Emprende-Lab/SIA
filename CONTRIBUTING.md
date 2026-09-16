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
cd visual/prototype
pnpm install --frozen-lockfile --ignore-workspace
pnpm lint
pnpm test
pnpm build
```

El prototipo usa Node 24, pnpm 9.15.9 y lockfile propio fuera del workspace raíz. `--ignore-workspace` coincide con la corrección de CI `a5f1796`.

Para API y contratos, seguir [Reproducir validaciones](docs/operacion-api.md#reproducir-validaciones): ya existen pruebas de API, dominio, autorización, integración y concurrencia PostgreSQL, Ruff, mypy y controles de drift OpenAPI/TypeScript. La raíz ejecuta lint/typecheck de web y contratos; no incluye el prototipo. Ejecutar solo controles aplicables al cambio; una actualización documental verifica enlaces y `git diff --check` sin repetir suites de aplicación innecesariamente.

Estado revisado al 2026-09-16: ambos workflows están verdes en `35775c0`; evidencia en la [guía operativa](docs/operacion-api.md#evidencia-vigente--2026-09-16). La web real aún es base y los E2E del MVP conectado quedan pendientes. La validación de staging exigida para liberar sigue siendo un paso independiente: un merge o CI verde no demuestra que se haya realizado.

## Reglas de datos y seguridad

- Nunca incluir secretos, tokens, archivos `.env` o datos de producción.
- Toda autorización debe validarse en backend.
- No sobrescribir ni eliminar historial relevante silenciosamente.
- No ampliar el MVP ni inventar reglas de negocio sin documentarlo y aprobarlo.
- Los cambios al seguimiento evolutivo deben referenciar las User Stories, reglas y criterios de diagnóstico, áreas, objetivos o ambiciones aplicables.
- Los cambios a informes técnicos deben indicar las fuentes de datos, reglas de versionado, permisos y criterios de aprobación aplicables.
