# AGENTS.md

## Proyecto

Plataforma de gestión de incubación de CataliTech / TEC Emprende Lab.

El sistema centraliza el seguimiento de proyectos incubados, sus objetivos, actividades, evidencias, reuniones, minutas, finanzas y compras, documentos, chat y alertas.

## Documentación obligatoria

Antes de modificar código, revisar:

1. Todos los documentos de `docs/00-nucleo-comun/`.
2. Los documentos del programa afectado: `docs/01-pre-incubacion/`, `docs/02-prototipado/` o `docs/03-puesta-en-marcha/`.

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
- Seguir el flujo de ramas, pull requests y verificaciones definido por el repositorio.
- Para informes técnicos, respetar `docs/00-nucleo-comun/ia-e-informes.md`: las versiones aprobadas son inmutables y todo contenido requiere fuentes trazables.

## Fuente de verdad

En caso de conflicto, usar este orden:

1. Decisiones confirmadas y reglas del documento de programa aplicable.
2. `docs/00-nucleo-comun/actores-roles-y-permisos.md`.
3. `docs/00-nucleo-comun/vision-y-alcance.md`.
4. Historias de usuario del programa aplicable.

## Convenciones

- `TBD`: decisión pendiente.
- `MUST`: obligatorio para MVP.
- `SHOULD`: deseable si no afecta tiempo o complejidad.
- `OUT OF SCOPE`: no debe implementarse sin aprobación.
