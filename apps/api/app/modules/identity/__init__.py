"""Identidad según docs/00-nucleo-comun/actores-roles-y-permisos.md.

La primera invitación se emite desde una terminal administrativa del backend:
uv run python -m app.modules.identity.service --email <correo> --operator <administrador>
Usa SIA_DATABASE_URL, exige que no haya usuarios ni invitaciones vigentes y registra
el operador en AuditLog. No autentica ni crea usuarios; el primer acceso sigue
requiriendo la invitación y un JWT válido de Clerk con email y email_verified=true
(booleano firmado, referido al mismo correo). Configurar esos claims en Clerk.

PostgreSQL serializa emisión/aceptación por correo mediante advisory transaction
locks. El bootstrap bloquea las tablas de identidad durante su transacción.
No se reasignan identidades por coincidencia de correo. Las invitaciones ambiguas
históricas fallan cerradas y requieren revisión administrativa.
"""
