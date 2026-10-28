# Mejora pendiente de pantallas vacías

Solicitud del usuario el **2026-10-28**, durante el
[recorrido de login y sistema](recorrido-login-2026-10-28.md).
Estado: **primera tanda implementada localmente; pendiente de publicar y recorrer en staging**.
Este documento registra la necesidad y criterios propuestos; no modifica requisitos
funcionales, permisos ni MVP.

## Primera tanda — implementación local

- Entrada sin proyectos: tarjeta con orientación y pasos, acceso a Expedientes para
  Coordinadora/Gestor y explicación de asignación para Emprendedor. No muestra un
  selector vacío como única salida. Reutiliza `canRegisterExpediente`.
- Se elimina la redirección general de `/expediente/:path*` al inicio para que las
  pantallas de alta/inscripción/ciclo ya existentes sean accesibles. Se conserva la
  redirección del enlace de ciclo al espacio de proyecto. Sin cambios de API o permisos.
- Selector: diferencia carga, error y ausencia de ciclos; permite actualizar el listado,
  muestra el ciclo seleccionado y ofrece gestionar expedientes a los roles existentes.
- Búsqueda del proyecto: alcance explícito, aviso de consulta, limpieza y términos sin
  espacios sobrantes. No incorpora búsqueda global ni fuentes nuevas.
- Evolución: explica el requisito de dos diagnósticos aprobados y enlaza a Diagnóstico
  360°. Historial se ofrece cuando existen fotografías.
- Evidencias: distingue filtros sin coincidencias, carpeta vacía y ciclo sin respaldos;
  limpiar filtros conserva la carpeta seleccionada. Sin actividades, orienta al plan
  en lugar de ofrecer un formulario de evidencia que no se puede completar.

Verificación local: lint, TypeScript, suite Web completa y build Next.js correctos.
La suite incluye render por capacidades de Coordinadora/Gestor/Emprendedor y selección
no disponible. El componente de entrada se inspeccionó con CSS compilado a 390 y
1440 px, sin desbordamiento horizontal y con foco visible por teclado. Es una vista
aislada sin identidad ni datos, no un recorrido autenticado de los cambios.
El recorrido de staging de referencia corresponde a la versión anterior.

Pendientes de esta mejora: verificar los cambios publicados con API/Clerk reales y
continuar las acciones de vacíos de Resumen, Ambiciones, Informes, Reuniones y bandeja.

## Problema observado

La Coordinadora recién autenticada llega a «No hay proyectos con ciclos disponibles
para tu cuenta». «Ver proyectos» abre un diálogo con «No hay proyectos disponibles»,
sin una acción visible para crear el primero. La lectura de la API devuelve `[]`,
sin errores de red. El recorrido se estanca pese a que el backend permite a la
Coordinadora registrar un emprendimiento, inscripción y ciclo.

Otros vacíos tienen mensajes, pero no siempre permiten continuar desde donde se lee
la orientación. En Evolución se indica «Usa Nuevo diagnóstico para comenzar», aunque
esa vista muestra Historial y no el botón Nuevo diagnóstico. Evidencias recomienda
agregar, mover o ajustar filtros con un único texto, incluso cuando no existe ninguna
evidencia. El Resumen presenta varios «No hay…» sin guiar el primer paso de un ciclo.

## Mejora solicitada y criterios propuestos

- Diferenciar **sin registros**, **sin proyecto seleccionado**, **sin asignación**,
  **sin coincidencias de filtros/búsqueda**, **capacidad pendiente** y **error de carga**.
  No presentar un error o falta de permisos como una colección vacía.
- Cada vacío explica qué falta, para qué sirve la sección y un siguiente paso concreto.
  La acción principal utiliza un flujo existente y es visible dentro del propio vacío.
- Para Coordinadora, la primera pantalla orienta al alta autorizada de expediente y
  ciclo; para otros roles, presentar solo las acciones que ya permitan las reglas
  vigentes. No habilitar por UI capacidades que el backend no autorice.
- Si el usuario no puede crear o validar, explicar cómo continuar mediante la persona
  que administra su alcance, sin inventar una solicitud, invitación o automatización nueva.
- No mostrar acciones que dependan de datos inexistentes sin explicar el requisito:
  por ejemplo, evidencia requiere actividad y Evolución requiere dos diagnósticos
  aprobados. La orientación debe enlazar al módulo correcto.
- Con filtros sin resultados, ofrecer limpiar los filtros; con fallo de carga,
  explicar el problema y permitir reintentar. Con finanzas no implementadas, conservar
  el aviso de disponibilidad y no simular presupuestos ni ofrecer altas inexistentes.
- Mantener estilo visual consistente, texto breve en español, jerarquía clara y acciones
  accesibles por teclado y en móvil. No llenar vacíos con datos ficticios en producción.

## Prioridad de implementación

1. Entrada sin proyectos y selector: eliminar el recorrido sin salida para Coordinadora.
2. Objetivos/actividades y Evidencias: guiar las dependencias entre registros.
3. Diagnóstico/Evolución y Resumen: orientar la primera fotografía y los primeros pasos.
4. Ambiciones, Informes, Reuniones, Chat, Equipo y bandeja: consistencia de mensajes,
   acciones, filtros, carga y errores respetando lo que cada módulo ya implementa.

## Trazabilidad y validación futura

La mejora de presentación deriva de «interfaz simple, consistente y comprensible» de
[visión y alcance](00-nucleo-comun/vision-y-alcance.md). Conserva la matriz de
[roles y permisos](00-nucleo-comun/actores-roles-y-permisos.md).
El contenido por módulo se vincula a US-PRO-001/002/004/005/006, US-PM-001/002/003 y
US-COM-001/002 según corresponda. Historia específica de onboarding/estados vacíos: `TBD`;
no se crea un identificador funcional nuevo ni se da por aceptada una historia existente.

- [ ] Diseñar y revisar vacíos con y sin permiso de alta.
- [ ] Reutilizar las operaciones backend y navegación existentes.
- [ ] Verificar colecciones vacías, selección pendiente, filtros sin resultados,
  errores de red y recuperación, sin confundir sus mensajes.
- [ ] Probar acciones por teclado y móvil, con Coordinadora y roles de alcance limitado.
- [ ] Confirmar que el primer registro reemplaza el vacío y persiste al recargar.

No incluye nuevas reglas de negocio, finanzas, gestión de roles, datos demo automáticos
ni capacidades nuevas para superar restricciones funcionales `TBD`.
