# Roles y permisos

La autorización se valida siempre en backend. El alcance de la acción depende tanto del rol como de la relación de la persona con el proyecto.

| Acción | Coordinadora | Gestor | Emprendedor |
|---|---:|---:|---:|
| Ver todos los proyectos | Sí | No | No |
| Ver proyectos asignados o propios | Sí | Sí | Sí |
| Ver reportes y dashboard global | Sí | No | No |
| Crear proyecto | Sí | Sí | No |
| Editar datos generales del proyecto | Sí | Sí, si está asignado | No |
| Finalizar proyecto | Sí | Sí, si está asignado | No |
| Asignar o quitar gestores | Sí | No | No |
| Gestionar emprendedores del proyecto | Sí | Sí, si está asignado | No |
| Invitar emprendedores | Sí | Sí, para sus proyectos | No |
| Invitar Coordinadoras o Gestores | Sí | No | No |
| Crear, modificar y aprobar objetivos | Sí | Sí, si está asignado | Crear y modificar |
| Crear y completar actividades | Sí | Sí, si está asignado | Sí |
| Adjuntar y ver evidencias | Sí | Sí, si está asignado | Sí |
| Registrar reuniones | Sí | Sí, si está asignado | No |
| Ver reuniones | Sí | Sí, si está asignado | Sí, en sus proyectos |
| Generar, editar, revisar y publicar minutas | Sí | Sí, si está asignado | No |
| Ver presupuesto, trámites y gastos | Sí | Sí, si está asignado | Sí, en sus proyectos |
| Gestionar presupuesto y gastos | Sí | Sí, si está asignado | No |
| Crear `DRAFT`, editar y enviar trámites propios | Sí | Sí, si está asignado | Sí, solo en `DRAFT` o `REQUIRES_CORRECTION` de sus proyectos |
| Completar datos administrativos de trámites no aprobados | Sí | Sí, si está asignado | No |
| Solicitar correcciones, rechazar o cancelar trámites no aprobados | Sí | Sí, si está asignado | No |
| Aprobar internamente, gestionar firmas, enviar a FUNDATEC y aprobar trámites | Sí | Sí, si está asignado | No |
| Ver y atender alertas | Sí | Sí, si está asignado | Ver, en sus proyectos |
| Leer y enviar mensajes en el chat del proyecto | Sí | Sí, si está asignado | Sí, en sus proyectos |
| Adjuntar archivos y mencionar miembros en el chat | Sí | Sí, si está asignado | Sí, en sus proyectos |
| Editar o eliminar visualmente mensajes propios | Sí | Sí, si está asignado | Sí, en sus proyectos |

## Coordinadora

La Coordinadora tiene todas las capacidades operativas de un Gestor sobre cualquier proyecto. Sus capacidades adicionales son la visibilidad global, el dashboard y los reportes globales, la asignación de gestores y la invitación de usuarios con rol Coordinadora o Gestor.

## Gestor

El Gestor realiza las operaciones permitidas solo en los proyectos donde está asignado. Puede crear proyectos e invitar o gestionar emprendedores de sus proyectos, pero no asignar o remover gestores ni acceder a datos globales.

## Emprendedor

El Emprendedor solo puede acceder a los proyectos de los que forma parte. Puede proponer y modificar objetivos, gestionar actividades y evidencias, iniciar y corregir sus propios trámites financieros, y consultar la información de seguimiento indicada en la matriz. No puede aprobar objetivos propios ni realizar acciones administrativas o de aprobación financiera.
