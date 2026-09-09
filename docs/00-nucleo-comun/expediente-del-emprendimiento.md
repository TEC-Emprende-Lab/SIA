# Expediente del emprendimiento

## Regla central

Cada emprendimiento tiene un expediente unico e historial persistente. El paso entre programas no elimina informacion previa. Un emprendimiento puede contener ciclos o proyectos especificos, por ejemplo un proyecto financiado de Prototipado, ademas de sus objetivos generales.

## Estructura minima

- `Entrepreneurship`: identidad, perfil y estado del emprendimiento.
- `ProgramEnrollment`: vinculacion historica con un programa, fecha de ingreso, estado y salida.
- `ProgramCycle`: ciclo, proyecto financiado o intervencion especifica dentro de una inscripcion.
- Gestores y emprendedores relacionados N:M con el emprendimiento o ciclo segun corresponda.

Los campos obligatorios del perfil, estados de inscripcion y reglas de transicion entre programas estan `TBD`.

## Historial y cambios

- Los objetivos aprobados no se modifican libremente: un cambio material invalida la aprobacion y requiere nueva validacion.
- Las aprobaciones, cambios de presupuesto, validaciones y cierres registran actor, fecha y trazabilidad.
- La vista de expediente permite consultar la evolucion entre momentos o versiones del emprendimiento.
- Un programa no puede alterar o eliminar los registros historicos de otro programa.

## Vistas comunes

El expediente ofrece, segun autorizacion, resumen, ciclos de programa, objetivos, actividades, evidencias, cronograma, reuniones, minutas, canales, finanzas cuando apliquen, alertas e informes.
