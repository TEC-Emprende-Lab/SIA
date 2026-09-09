# Vision y alcance

## Proposito

SIA acompana emprendimientos de forma asincronica durante programas de incubacion. Conserva el expediente y el historial del emprendimiento mientras avanza entre programas; no es un gestor generico de objetivos y actividades.

El nucleo comun no define entregables ni reglas exclusivas de un programa. Esos elementos se especifican en los directorios de cada programa.

## Programas

| Programa | Proposito | Salida esperada | Prioridad |
|---|---|---|---|
| Pre-incubacion | Estructurar y validar oportunidad, cliente y modelo de negocio. | Preparado para prototipar o aplicar a fondos. | Posterior. |
| Prototipado | Construir y validar una solucion con usuarios o clientes. | Prototipo validado con evidencia de pruebas y aprendizaje. | Inicial. |
| Puesta en marcha | Convertir una solucion validada en una operacion comercial sostenible. | Listo para operar, vender y crecer. | Inicial. |

Pre-incubacion queda fuera del primer alcance implementable. Prototipado y Puesta en marcha son la prioridad funcional inicial.

## Alcance inicial

El MVP inicial incluye el nucleo comun y los programas Prototipado y Puesta en marcha. Incluye expediente, objetivos, actividades, evidencias, cronograma, reuniones, minutas, alertas, informes y las funciones financieras definidas para cada programa.

Quedan fuera del primer alcance:

- convocatoria, evaluacion y seleccion de emprendimientos;
- videollamadas internas y almacenamiento de grabaciones;
- aprobaciones financieras o de entregables automaticas mediante IA;
- integracion automatica con el sistema administrativo hasta confirmar su viabilidad;
- implementacion completa de Pre-incubacion.

## Principios

- La interfaz debe ser simple, consistente y comprensible para personas con distintos niveles de experiencia tecnologica.
- La plataforma centraliza informacion, reduce trabajo manual y conserva trazabilidad.
- La autorizacion se valida en backend.
- Las acciones relevantes conservan actor, fecha y cambios aplicados.
- Un registro historico no se elimina ni se sobrescribe silenciosamente.

## Arquitectura objetivo

- Frontend: Next.js y TypeScript.
- Backend y reglas de negocio: FastAPI con Python.
- Datos, auditoria y cola persistente: PostgreSQL.
- Identidad: Clerk Cloud con Google OAuth y JWT; Clerk no es fuente de verdad de autorizacion.
- Archivos privados: Cloudflare R2 mediante URLs firmadas autorizadas por FastAPI.
- Correo: Resend.
- Tiempo real: Socket.IO servido por FastAPI.
- Tareas asincronas: worker Python con PostgreSQL como cola persistente.
- Redis: rate limiting distribuido y adaptador Socket.IO al escalar.
- Despliegue: Coolify; `develop` despliega a staging y `main` a produccion.

Todo trafico de produccion usa HTTPS. FastAPI valida firma, emisor, audiencia y vigencia del JWT antes de aplicar autorizacion. Los endpoints sensibles o costosos usan rate limiting distribuido y responden `429` sin ejecutar la accion cuando se excede el limite.
