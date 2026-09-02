# AGENTS.md

## Proyecto

Plataforma de gestión de incubación de CataliTech / TEC Emprende Lab.

El sistema centraliza el seguimiento de proyectos incubados, sus objetivos, actividades, evidencias, reuniones, minutas, finanzas y compras, documentos, chat y alertas.

## Documentación obligatoria

Antes de modificar código, revisar:

1. `docs/00_PROJECT_CONTEXT.md`
2. `docs/01_PRODUCT_REQUIREMENTS.md`
3. `docs/02_USER_STORIES.md`
4. `docs/03_BUSINESS_RULES.md`
5. `docs/04_ROLES_PERMISSIONS.md`
6. `docs/05_FUNCTIONAL_FLOWS.md`
7. `docs/06_DATA_MODEL.md`
8. `docs/07_NON_FUNCTIONAL_REQUIREMENTS.md`
9. `docs/08_UI_UX_GUIDELINES.md`
10. `docs/09_INTEGRATIONS.md`
11. `docs/10_ACCEPTANCE_CRITERIA.md`
12. `docs/11_MVP_SCOPE.md`
13. `docs/12_DEVELOPMENT_WORKFLOW.md`
14. `docs/13_ARCHITECTURE.md`

## Reglas para agentes de IA

- No inventar requerimientos.
- No ampliar el alcance del MVP sin instrucción explícita.
- No modificar reglas de negocio sin autorización.
- Si falta una decisión funcional, marcarla como `TBD`.
- No asumir permisos no documentados.
- Toda validación de autorización debe existir en backend.
- Cada cambio funcional debe indicar la User Story asociada.
- Cada implementación debe verificar los criterios de aceptación.
- Mantener trazabilidad entre requerimientos, User Stories y reglas de negocio.
- No eliminar información histórica salvo que exista un requerimiento explícito.
- Priorizar una arquitectura simple y mantenible.
- Evitar dependencias innecesarias.
- Seguir el flujo de ramas, pull requests y verificaciones definido en `docs/12_DEVELOPMENT_WORKFLOW.md`.

## Fuente de verdad

En caso de conflicto, usar este orden:

1. `03_BUSINESS_RULES.md`
2. `02_USER_STORIES.md`
3. `01_PRODUCT_REQUIREMENTS.md`
4. `04_ROLES_PERMISSIONS.md`
5. `11_MVP_SCOPE.md`
6. `08_UI_UX_GUIDELINES.md`

## Convenciones

- `TBD`: decisión pendiente.
- `MUST`: obligatorio para MVP.
- `SHOULD`: deseable si no afecta tiempo o complejidad.
- `OUT OF SCOPE`: no debe implementarse sin aprobación.
