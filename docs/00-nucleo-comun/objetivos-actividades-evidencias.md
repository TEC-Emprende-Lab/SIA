# Objetivos, actividades y evidencias

## Reglas comunes

- Cada programa define sus propias areas, canvas y entregables.
- Cada objetivo pertenece a un area del canvas de su programa. Puede vincularse opcionalmente a una ambicion del emprendimiento; la ambicion no sustituye ni duplica el objetivo.
- Las ambiciones se conservan como aspiraciones visibles del emprendimiento y pueden existir sin objetivos asociados.
- Un entregable debe desagregarse en objetivos y actividades; no basta marcar un tema amplio como completado.
- Cada actividad se asocia al objetivo y entregable de su programa y puede alimentar un calendario o cronograma.
- Objetivos y actividades no tienen pesos manuales configurables. Su calculo de avance, si aplica, usa pesos equivalentes.
- Un objetivo aprobado que cambia vuelve a estado pendiente de validacion.
- Una actividad puede configurarse para autocompletado, pero su condicion concreta esta `TBD` y no se automatiza en el alcance inicial.

## Avance del ciclo — decisión confirmada 2026-09-29

Al aprobar la ejecución por fases del dashboard basado en el mockup, se confirma:

- El avance de un objetivo es actividades completadas / actividades totales × 100;
  sin actividades es 0 %.
- El avance del ciclo es el promedio de los avances de los objetivos actualmente
  aprobados, con igual peso por objetivo. Sin objetivos aprobados es 0 %.
- Los objetivos no aprobados se muestran, pero no participan del promedio del ciclo.
- FastAPI calcula los porcentajes a partir de registros vigentes: no se ingresan
  manualmente ni se almacenan porcentajes derivados.
- Se conserva la regla actual: cambiar actividades, finalizarlas/reabrirlas o añadir
  evidencias invalida la aprobación del objetivo. Esto puede reducir el avance del
  ciclo hasta una nueva validación; la UI debe explicarlo.

## Flujo de validacion

1. El Emprendedor registra objetivo, actividad y evidencia en su emprendimiento autorizado.
2. El sistema conserva el borrador y permite enviarlo para validacion.
3. Un Gestor asignado o Coordinadora valida, solicita correccion o rechaza segun las reglas del programa.
4. La validacion de un hito o entregable puede habilitar el siguiente entregable, bloque o programa cuando la especificacion del programa lo defina.

## Evidencias

Una evidencia puede ser archivo, fotografia, video o enlace. Los archivos son privados y solo se entregan tras autorizacion backend; sus limites de tamano y MIME estan `TBD`.

## Evolucion

Los programas pueden registrar versiones o momentos de evaluacion para comparar la evolucion del emprendimiento. Areas, escalas, entregables obligatorios y criterios comparativos pertenecen a cada programa; no se infieren automaticamente.
