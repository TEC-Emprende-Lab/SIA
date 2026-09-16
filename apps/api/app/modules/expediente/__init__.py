"""Base de expediente de US-PRO-001 y US-PM-001: ámbito autorizado e historial.

Fuente: docs/00-nucleo-comun/{expediente-del-emprendimiento,actores-roles-y-permisos}.
La asignación a ciclo permite leer su resumen de expediente e inscripción, pero
no administrar el expediente, crear hermanos ni acceder a ciclos no asignados.
Solo Coordinadora asigna/remueve gestores; crear no concede una asignación.

Las revocaciones conservan la fila y AuditLog; toda consulta de autorización debe
filtrar revoked_at IS NULL. Reasignar crea una fila nueva. Los listados aplican
el ámbito antes de limit/offset (50 por defecto, máximo 100 en HTTP).

Perfil, estados y transiciones continúan TBD. No se inscribe automáticamente en
Puesta en marcha: falta definir la validación de sus prerrequisitos documentados.
Los criterios de actividades y seguimiento de esas US pertenecen a su módulo.
"""
