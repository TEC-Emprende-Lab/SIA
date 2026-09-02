# Integraciones

## Identidad y autenticación

### Objetivo

Permitir inicio de sesión con Google para personas invitadas previamente.

### Implementación definida

- Clerk Cloud gestiona Google OAuth, sesiones y JWT;
- FastAPI valida los JWT emitidos por Clerk mediante el emisor y las claves públicas configuradas;
- cuenta Google cuyo correo verificado coincide con una invitación vigente de SIA;
- las invitaciones, roles, proyectos y permisos se almacenan y validan en PostgreSQL mediante FastAPI, no en Clerk;
- sin autenticación local ni recuperación de contraseña en el MVP.

Clerk se utiliza exclusivamente para identidad y sesión. No es fuente de verdad de autorización ni de datos de negocio.

## Correo electrónico

### Usos previstos

- invitaciones de acceso;
- alertas y recordatorios;
- notificaciones de aprobación.

### Proveedor definido

Resend.

## Google Meet y Zoom

### Nivel de integración MVP

Se almacenan enlaces o referencias de reuniones, grabaciones y transcripciones. No se integrarán APIs de Meet o Zoom durante el MVP.

## Transcripción

La transcripción se carga o pega manualmente en la plataforma. El MVP no procesa archivos de audio o video para generar transcripciones.

## IA para minutas

### Proveedor definido

OpenAI.

### Entrada y salida

La entrada es una transcripción disponible. La salida es una minuta estructurada identificada como generada por IA y almacenada inicialmente como borrador.

### Restricciones

- no inventar acuerdos, responsables ni fechas;
- diferenciar datos explícitos de inferencias;
- conservar trazabilidad hacia la reunión;
- requerir revisión humana antes de publicar.

## Almacenamiento de archivos

### Proveedor definido

Cloudflare R2.

Los archivos se almacenan de forma privada y se entregan mediante URLs firmadas tras validar autorización.

## Excel y activos (post-MVP)

La integración `Excel -> Plataforma` y el registro de activos están fuera del MVP. Si se implementan, la integración será unidireccional y no modificará el archivo fuente.

## Infraestructura

- frontend: Next.js con TypeScript;
- backend: FastAPI con Python;
- identidad: Clerk Cloud;
- base de datos: PostgreSQL;
- despliegue: Coolify en servidor propio;
- respaldos: diarios, con retención de 30 días;
- entornos: staging desde `develop` y producción desde `main`;
- tiempo real: Socket.IO servido por FastAPI;
- tareas asíncronas: worker Python con PostgreSQL como cola persistente;
- Redis: rate limiting distribuido y adaptador de Socket.IO cuando existan múltiples instancias API;
- PostgreSQL: fuente de verdad, auditoría y cola persistente; Redis no almacena datos de negocio ni reemplaza la cola principal.

## Microsoft Teams

No existe integración ni migración con Microsoft Teams. Para emprendimientos nuevos, la plataforma reemplaza Teams como herramienta operativa; los emprendimientos existentes permanecen allí únicamente como historial.
