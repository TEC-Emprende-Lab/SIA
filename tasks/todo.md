# Consolidacion de decisiones

- [x] Actualizar requisitos, historias, reglas y permisos.
- [x] Actualizar flujos, modelo de datos e integraciones.
- [x] Actualizar criterios de aceptacion y alcance del MVP.
- [x] Revisar coherencia documental y registrar resultado.

## Revision

Requisitos, permisos, flujos, modelo, integraciones, criterios y alcance revisados. Las decisiones confirmadas se consolidaron y los temas no resueltos se mantienen como `TBD`.

## Tramites financieros

- [x] Actualizar requisitos, historias, reglas y permisos de tramites.
- [x] Actualizar flujo, modelo de datos, criterios y alcance.
- [x] Revisar coherencia y registrar resultado.

Resultado: el trámite financiero sustituye a la cotización como entidad operativa. Sus estados, documentos, transiciones, contabilización única, permisos y reportes quedaron alineados entre requisitos, flujos, modelo y criterios.

## Flujo detallado de solicitudes

- [x] Actualizar requisitos, historias, reglas, permisos y flujos.
- [x] Actualizar modelo, criterios de aceptación y alcance.
- [x] Revisar coherencia y registrar resultado.

Resultado: se consolidó el flujo detallado de solicitudes, con borrador, revisión, corrección, aprobación interna, firmas, FUNDATEC, aprobación final y cierre con motivo. El checklist administrativo, documentos y permisos quedaron reflejados en el modelo y criterios.

## Chat y reemplazo de Teams

- [x] Actualizar alcance, requisitos, historias, reglas y permisos.
- [x] Actualizar flujos, modelo, UX, seguridad y criterios.
- [x] Revisar coherencia y registrar resultado.

Resultado: Teams queda como historial sin integración ni migración para emprendimientos existentes. El MVP incorpora un único chat por proyecto, adjuntos privados, menciones, no leídos, notificaciones internas y por correo, y edición/eliminación visual con auditoría.

## Flujo de desarrollo e infraestructura

- [x] Documentar arquitectura de entornos y servicios.
- [x] Documentar Git, CI/CD, desarrollo local y pruebas.
- [x] Revisar coherencia con alcance e integraciones.

Resultado: se definieron desarrollo local con Docker Compose, CI obligatorio, staging desde `develop`, producción desde `main`, servicios `web` y `worker`, y PostgreSQL como cola persistente. La decisión inicial de no usar Redis fue reemplazada posteriormente.

## Prototipo visual SIA

- [x] Inicializar prototipo estático reutilizable.
- [x] Implementar dashboard de Coordinadora y navegación del proyecto.
- [x] Implementar módulos visuales del proyecto y datos ficticios.
- [x] Verificar build y documentar resultado.

Resultado: se creó un mockup navegable de SIA con dashboard de Coordinadora y vista de proyecto. No usa servicios ni persistencia; incluye datos ficticios, la paleta oficial y una versión autocontenida en `visual/prototype/bundle.html`.

## Kanban de plan de trabajo

- [x] Documentar la vista Kanban de objetivos y actividades.
- [x] Representar el Kanban en el prototipo visual.
- [x] Verificar el build del prototipo.

Resultado: el módulo Objetivos y actividades incorpora una vista Kanban por proyecto. El prototipo muestra columnas por estado y tarjetas con objetivo asociado, responsable, fecha y evidencias; la versión `bundle.html` fue actualizada.

## Base de colaboración del repositorio

- [x] Crear documentación de inicio y contribución.
- [x] Configurar plantilla de pull request y automatización de calidad.
- [x] Ajustar reglas del proyecto y verificar el prototipo.

Resultado: se añadieron README raíz, guía de contribución, EditorConfig, plantilla de PR y CI para el prototipo. Se eliminaron dependencias de plantilla no usadas; lint, build y la vista financiera unificada fueron verificados.

## Finanzas y compras unificadas

- [x] Documentar el módulo financiero unificado.
- [x] Unificar Trámites y Presupuesto en el prototipo.
- [x] Verificar build y actualizar el HTML autónomo.

Resultado: Finanzas y compras agrupa presupuesto, solicitudes, estados, movimientos y reportes en una única pestaña del proyecto. El mockup y `bundle.html` fueron actualizados.

## Arquitectura FastAPI y Clerk

- [x] Actualizar integraciones, modelo de identidad y seguridad.
- [x] Actualizar flujo de desarrollo, alcance y README.
- [x] Revisar coherencia documental.

Resultado: la arquitectura oficial usa Next.js como frontend, FastAPI como backend, Clerk Cloud para identidad y JWT, y un worker Python. PostgreSQL conserva invitaciones, roles, autorización, auditoría y la cola persistente; Redis se añadió posteriormente para rate limiting y escalabilidad de Socket.IO.

## Redis para escalabilidad

- [x] Documentar Redis para rate limiting y Socket.IO.
- [x] Actualizar seguridad, desarrollo local y alcance técnico.
- [x] Revisar coherencia documental.

Resultado: Redis se utiliza para rate limiting distribuido y para coordinar Socket.IO al escalar FastAPI. PostgreSQL conserva los datos de negocio, auditoría y cola persistente.

## Diagrama de arquitectura

- [x] Documentar componentes y flujos de arquitectura.
- [x] Enlazar el diagrama desde la documentación principal.

Resultado: `docs/13_ARCHITECTURE.md` contiene el diagrama Mermaid, responsabilidades, flujos de autenticación/chat/tareas y servicios por entorno.

## Organización visual del repositorio

- [x] Agrupar marca y prototipo dentro de `visual/`.
- [x] Actualizar enlaces, CI, ignores e importaciones.
- [x] Verificar el build del prototipo en su nueva ubicación.

Resultado: la marca se organiza en `visual/brand/` y el mockup en `visual/prototype/`. README, CI, imports e ignores se actualizaron; lint, build y `bundle.html` se verificaron desde la nueva ubicación.
