# Actores, roles y permisos

La autorizacion depende del rol y de la relacion con el emprendimiento o ciclo. Debe validarse siempre en backend.

## Roles

- **Coordinadora:** visibilidad global y todas las capacidades operativas de un Gestor sobre cualquier emprendimiento.
- **Gestor:** opera solo en emprendimientos o ciclos asignados. Puede crear emprendimientos y gestionar emprendedores de su alcance, pero no asigna o remueve gestores.
- **Emprendedor:** accede solo a los emprendimientos donde participa; registra avances, actividades y evidencias, sin aprobar sus propios entregables ni ejecutar acciones administrativas.
- **Revisor financiero:** roles exactos, alcance y separacion respecto a Coordinadora o Gestor: `TBD`.

## Acceso e invitacion

El acceso usa exclusivamente Google OAuth mediante Clerk. El primer acceso requiere una invitacion vigente, no utilizada y asociada al mismo correo verificado. Las invitaciones, roles y relaciones de negocio se almacenan y validan en PostgreSQL mediante FastAPI.

## Matriz comun

| Accion | Coordinadora | Gestor asignado | Emprendedor |
|---|---:|---:|---:|
| Consultar expediente e historial | Si, todos | Si, asignados | Si, propios |
| Crear emprendimiento o ciclo | Si | Si | No |
| Asignar o remover gestores | Si | No | No |
| Gestionar emprendedores | Si | Si, asignados | No |
| Registrar avances, actividades y evidencias | Si | Si, asignados | Si, propios |
| Validar entregables, hitos u objetivos | Si | Si, asignados | No |
| Registrar reuniones y publicar minutas | Si | Si, asignados | No |
| Consultar canales del emprendimiento | Si | Si, asignados | Si, propios |
| Gestionar presupuesto y compras | Si | Si, asignados | No, salvo el flujo que defina el programa |
| Consultar ejecucion financiera | Si | Si, asignados | Si, propios |
| Preparar, revisar y aprobar informes | Si | Si, asignados | Puede proponer informacion de sus proyectos |

Los permisos detallados de presupuesto, compras y facturas se definen por programa. Ninguna ocultacion en frontend sustituye la autorizacion backend.
