# Integraciones

## Google Authentication

### Objetivo

Permitir inicio de sesión mediante Google OAuth para personas invitadas previamente.

### Implementación definida

- Better Auth integrado en la aplicación;
- cuenta Google cuyo correo coincide con una invitación vigente;
- rol inicial obtenido de la invitación;
- sin autenticación local ni recuperación de contraseña en el MVP.

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

- aplicación: Next.js con TypeScript;
- base de datos: PostgreSQL;
- despliegue: Coolify en servidor propio;
- respaldos: diarios, con retención de 30 días;
- entornos: staging desde `develop` y producción desde `main`;
- tiempo real: Socket.IO integrado en la aplicación;
- tareas asíncronas: worker interno con PostgreSQL como cola persistente;
- Redis: fuera del MVP, salvo necesidad de escalado demostrada.

## Microsoft Teams

No existe integración ni migración con Microsoft Teams. Para emprendimientos nuevos, la plataforma reemplaza Teams como herramienta operativa; los emprendimientos existentes permanecen allí únicamente como historial.
