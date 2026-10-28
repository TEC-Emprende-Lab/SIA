# IA e informes

## Principios de IA

OpenAI puede asistir con borradores de minutas, deteccion de acuerdos, propuestas de proximos objetivos o actividades e informes. Su salida siempre inicia como borrador y no sustituye la aprobacion humana de entregables, hitos, compras ni cambios presupuestarios.

La IA solo usa fuentes seleccionadas y no puede inventar hechos, evidencias, impactos, conclusiones, aprobaciones ni causalidad. Los datos faltantes se muestran como `Pendiente de completar`.

## Informe tecnico

Cada emprendimiento prepara un informe tecnico periodico, inicialmente mensual. El informe reutiliza objetivos, actividades completadas, evidencias, minutas, acuerdos y avances financieros del periodo.

Un informe identifica emprendimiento, ciclo cuando aplique, periodo, tipo y version. Todo contenido conserva referencias a sus fuentes; una version aprobada es una instantanea inmutable. Una correccion crea una nueva version vinculada, sin modificar la aprobada.

Solo Gestor asignado o Coordinadora puede enviar, revisar y aprobar. El PDF se genera despues de aprobar y se almacena de forma privada. La plantilla y los campos obligatorios del informe mensual estan `TBD`.

## Servicios y operacion

FastAPI compone los datos autorizados. La cola persistente de PostgreSQL y el worker
procesan hoy el PDF posterior a la aprobación; el archivo se guarda en el almacén
privado y se entrega mediante URL firmada después de autorizar el ciclo. Las tareas de
minutas IA, correo Resend y alertas programadas, así como sus proveedores reales,
siguen pendientes. Sin almacenamiento configurado el PDF queda en cola para reintento.
