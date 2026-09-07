# Alcance del MVP

## IN SCOPE

### Identidad y acceso

- autenticación;
- Google Sign-In;
- acceso exclusivamente mediante invitación previa y cuenta Google coincidente;
- roles y permisos.

### Proyectos

- creación;
- consulta;
- estado activo/finalizado;
- asignación de gestores;
- asociación de emprendedores.

### Seguimiento

- objetivos;
- aprobación de objetivos;
- re-aprobación tras cambios;
- actividades;
- evidencias;
- vista Kanban de objetivos y actividades por proyecto;
- avance.

- diagnósticos 360° por proyecto, historial y comparación por área;
- necesidades detectadas, sus vínculos de seguimiento y validación explícita de cierre;
- ambiciones estratégicas vinculadas con objetivos operativos sin duplicarlos;
- indicadores evolutivos para Coordinadora y Gestores.
- informes técnicos de seguimiento y cierre, versionados, trazables y con PDF posterior a aprobación.
- alertas de preparación de informes según la periodicidad configurada por proyecto.

### Reuniones

- registro de reuniones;
- referencia a Meet/Zoom;
- transcripción cargada manualmente;
- generación de minuta con IA.

### Operación

- alertas;
- bitácoras/seguimiento faltante;
- trámites de compra, reintegro y pago;
- revisión, envío a FUNDATEC y aprobación de trámites;
- módulo unificado de finanzas y compras: presupuesto, gastos derivados y trámites;
- reportes financieros por sesión, mes y proyecto.

### Visualización

- vista consolidada por proyecto;
- dashboard global de Coordinadora.

### Comunicación

- un chat general por proyecto;
- mensajes, archivos, menciones y mensajes no leídos;
- notificaciones internas y por correo;
- edición y eliminación visual de mensajes con auditoría.

---

## OUT OF SCOPE salvo aprobación posterior

- aplicación móvil nativa;
- CRM completo;
- facturación electrónica;
- marketplace;
- contabilidad completa;
- nómina;
- sistema de compras empresarial completo;
- firma digital avanzada;
- gestión documental general fuera del contexto del proyecto;
- registro de activos;
- escritura bidireccional hacia Excel;
- importación o sincronización desde Excel;
- transcripción automática de archivos de audio o video;
- integración por API con Google Meet o Zoom;
- integración o migración desde Microsoft Teams;
- funcionalidades que no estén relacionadas con incubación y seguimiento.

- análisis automatizado por IA de diagnósticos o recomendaciones automáticas de cierre.
- generación autónoma de conclusiones, impactos o aprobaciones en informes técnicos.

---

## TBD antes de cerrar especificación

1. Nombre final del sistema.
2. Campos obligatorios al crear un proyecto.
3. Campos de perfil de Emprendedor y Gestor.
4. Métricas adicionales del dashboard global, fuera de los reportes de trámites definidos.
5. Política de almacenamiento y retención de grabaciones y transcripciones.
6. Condición concreta para el autocompletado de actividades, si se incorpora después del MVP inicial.
7. Campos estructurados del perfil del emprendimiento y catálogo de programas.
8. Entidad y flujo de aprobación para cambios formales de alcance del proyecto.

---

## Decisiones confirmadas

- Un Emprendedor puede pertenecer a varios proyectos.
- Un Gestor asignado o una Coordinadora puede finalizar un proyecto.
- Los objetivos rechazados regresan al Emprendedor para corrección y reenvío.
- El avance se calcula con pesos equivalentes: los objetivos aprobados promedian el avance de sus actividades y el proyecto promedia sus objetivos aprobados.
- La configuración de autocompletado se guarda, pero no ejecuta automatización en el MVP inicial.
- La periodicidad de alertas de seguimiento se configura por proyecto.
- Gestores y Coordinadoras pueden gestionar presupuesto y trámites de los proyectos que tengan permitidos; los trámites aprobados se contabilizan como gasto una única vez.
- El Emprendedor puede guardar, corregir y enviar trámites de compra por orden de compra, pago de contrato, reintegro u otro tipo permitido, con sus documentos de respaldo.
- Los trámites usan los estados `DRAFT`, `UNDER_REVIEW`, `REQUIRES_CORRECTION`, `INTERNALLY_APPROVED`, `IN_SIGNATURE_PROCESS`, `IN_FUNDATEC_SYSTEM`, `APPROVED` y `REJECTED_OR_CANCELLED`.
- Los trámites aprobados son inmutables: no se modifican, anulan ni revierten presupuesto en el MVP.
- Los reportes de trámites se consultan por sesión, mes y proyecto, según el alcance del rol.
- Las minutas generadas con IA requieren revisión humana global antes de publicarse.
- La autenticación usa Google mediante Clerk Cloud y una invitación previa; cualquier cuenta Google puede acceder si coincide con una invitación vigente.
- El almacenamiento privado usa Cloudflare R2, el correo usa Resend y la IA para minutas usa OpenAI.
- La aplicación usa Next.js con TypeScript como frontend, FastAPI con Python como backend, PostgreSQL y Coolify en servidor propio. PostgreSQL tendrá respaldos diarios con retención de 30 días.
- `develop` se despliega a staging y `main` a producción en Coolify. Ambos entornos mantienen datos, buckets y credenciales separados.
- FastAPI sirve Socket.IO para el chat en tiempo real y un worker Python usa PostgreSQL como cola persistente. Redis gestiona rate limiting distribuido y permite escalar Socket.IO entre instancias API; no almacena datos de negocio ni reemplaza PostgreSQL.
- Para emprendimientos nuevos, la plataforma reemplaza Teams. Los emprendimientos existentes permanecen en Teams como historial, sin migración ni integración.
- Cada proyecto tiene un único chat general; no hay mensajes directos ni chats separados por trámite en el MVP.
- El chat permite adjuntar cualquier tipo de archivo, menciones, notificaciones internas y por correo, edición y eliminación visual auditada de mensajes propios.
- El diagnóstico 360° es una fotografía histórica por proyecto; las áreas se administran mediante catálogo extensible y los diagnósticos aprobados son inmutables.
- Las necesidades requieren validación explícita para cerrarse; actividades completadas no las atienden automáticamente.
- Ambiciones es una capa estratégica. Su tipo Objetivo vincula un objetivo operativo existente o creado por el flujo normal, sin duplicarlo.
- Los informes técnicos reutilizan datos existentes por período, conservan fuentes e instantáneas al aprobarse, y sus correcciones generan una nueva versión.
- La periodicidad de informes solo genera alertas; no crea ni emite informes sin revisión humana.
- Los campos estructurados del perfil, el programa del proyecto y los cambios formales de alcance no tienen entidad definida aún; el informe los presenta como `Pendiente de completar` hasta contar con registros fuente aprobados.
