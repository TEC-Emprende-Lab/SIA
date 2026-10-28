# Evidencias: carpetas y exploración

Decisión confirmada por el usuario el **2026-10-12**. Trazabilidad: ampliación de
US-PRO-001 y US-PM-001; conserva US-PRO-002 y US-PM-002 (validación e historial).

## Permisos y alcance

- Coordinadora (administración) puede organizar los ciclos autorizados globalmente.
- Gestor y Emprendedor pueden crear/renombrar carpetas y organizar evidencias dentro
  de su alcance vigente. FastAPI autoriza cada lectura y escritura por ciclo.
- Cada ciclo tiene sus carpetas personalizadas; no hay carpetas globales compartidas
  entre emprendimientos ni traslado a otro ciclo. El expediente conserva los ciclos.

## Organización

- Carpetas automáticas: vistas derivadas de los objetivos y sus actividades, sin
  duplicar archivos ni sembrar registros al consultar.
- Carpetas personalizadas: un nivel de carpetas por tema, con nombre editable y revisión
  optimista. No se implementa borrado ni subcarpetas personalizadas en esta entrega.
- «Todas» mantiene el acceso a cada evidencia; «Sin carpeta personalizada» reúne las
  no ubicadas. La búsqueda combina título, descripción y actividad; el filtro de tipo
  permite enlaces, documentos, fotografías y videos.
- La carga permite elegir actividad y carpeta personalizada. La ubicación inicial se
  guarda en la misma transacción que el registro de evidencia.
- El detalle permite abrir el respaldo autorizado, navegar a su actividad y cambiar
  de carpeta. La UI distingue carga, vacío, errores y conflicto de revisión.

## Historial y datos

Migración **008**, posterior a `007`: `evidence_folders` y `evidence_placements`.
La ubicación se almacena separada de la evidencia inmutable. FK compuestas impiden
cruzar el ciclo de una carpeta o evidencia. No se modifica contenido, URL, documento,
actividad original, informe aprobado ni instantánea de validación al mover.

Crear o renombrar carpetas y mover evidencias registra actor y cambios en auditoría.
La revisión optimista evita sobrescribir una ubicación o nombre modificado por otro
usuario. Agregar una evidencia nueva conserva la regla existente: reabre la aprobación
del objetivo; reorganizar una ya existente no la reabre.

## Criterios de aceptación y verificación

1. Roles autorizados crean y renombran carpetas; un usuario ajeno recibe 403.
2. Carpetas y evidencias de otro ciclo se rechazan, incluso dentro del mismo proyecto.
3. Mover o quitar ubicación conserva evidencia y estado/revisión del objetivo aprobado.
4. Revisiones obsoletas devuelven 409 y una carpeta vacía de nombre devuelve 422.
5. Evidencia nueva con carpeta se registra atómicamente y conserva las reglas de validación.
6. Vistas automáticas y personalizadas filtran sin duplicar evidencias; búsqueda y tipo
   se combinan con la actividad seleccionada.

Pruebas: `apps/api/tests/test_seguimiento.py` y `apps/web/tests/evidence-folders.mjs`.
La configuración de almacenamiento y límites MIME/tamaño existentes no cambian.
La migración no se ha aplicado a una base del usuario ni a staging. El recorrido
autenticado de UI y la revisión visual móvil/escritorio siguen pendientes.
