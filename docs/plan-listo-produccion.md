# Plan para dejar SIA usable en producción

Corte: 2026-11-10. Estado leído en staging y producción, más la revisión visual con sesión de Coordinadora. Este documento es el borrador del corte. Las decisiones marcadas `TBD` no se implementan hasta que se confirmen.

## Ya corregido en local, todavía no publicado

Estos tres defectos están en el código de `develop` y no aparecen en `sia.neuroboard.app` ni en `sia.dev.neuroboard.app` hasta que se publique el web.

1. Inicio sin proyecto. Si no hay ciclo elegido, la miga dice Inicio y ninguna sección queda marcada. Elegir una sección o la marca abre el selector de proyectos.
2. Finanzas sin partidas. El botón «Registrar primera partida» queda debajo del texto, no encima de la frase.
3. Actividades. Lista, resumen y detalle usan la misma regla que el tablero: Pendiente, Vencida o Completada. El filtro de la lista incluye Vencidas. Una fecha pasada no se puede «desvencer» arrastrando la tarjeta; sigue saliendo de la fecha de fin.

## Lo que ya se puede hacer

Con Coordinadora, en Prototipado: crear emprendimiento, abrir ciclo, objetivos, actividades, evidencias, reuniones, chat por canal, finanzas de prototipado e informes. En producción la base visible está vacía. En staging el recorrido de octubre sigue ahí y sirvió para ver esas pantallas.

## Decisiones del 2026-11-10

- El corte de uso real incluye Prototipado y Puesta en marcha, con Coordinadora, Gestor y Emprendedor.
- El correo de invitación espera dominio y Resend. Hasta entonces Coordinadora avisa el enlace por fuera y la persona entra con Google si el correo coincide.
- Equipo lista las asignaciones activas. La ven Coordinadora y Gestor. El Emprendedor no ve al resto. Solo Coordinadora asigna y revoca.
- Respaldos, republicación del worker y construcción de la API desde Git quedan para después. El riesgo de no tener respaldos sigue abierto.

## Fuera de este corte

- Pre-incubación.
- Correo de invitación y Resend.
- Respaldos, métricas del servidor, Clerk de staging y el modo de publicar la API.
- Reglas de finanzas que siguen `TBD`: reserva y disponible operativo, catálogo, FUNDATEC, revisor financiero, importación de Ronda 3.
- Finanzas de Puesta en marcha: el programa todavía no define partidas, flujo ni estados. No entra en este corte.
- Borrar datos históricos o datos de prueba de staging.

## Lo que hay que construir

### 1. Equipo visible

Decidido. La consulta lee asignaciones activas ya guardadas, de ciclo y de emprendimiento, sin borrar el historial revocado. Coordinadora y Gestor del ámbito la ven. Emprendedor no. Asignar y revocar sigue siendo solo de Coordinadora. La pantalla deja de limitarse a lo registrado en la visita.

### 2. Alta de Puesta en marcha

Decidido. Coordinadora deja constancia de las tres condiciones ya escritas: modelo de negocio definido, prototipo validado y evidencia de pruebas o aceptación de mercado. Con esa constancia se puede abrir el ciclo. Canvas, objetivos, actividades, evidencias, reuniones e informes del programa siguen como están. Presupuesto de Puesta en marcha no entra.

### 3. Recorrido de los tres roles

Coordinadora ya se recorrió. Falta el mismo recorrido con Gestor y con Emprendedor en Prototipado y, cuando el alta exista, en Puesta en marcha: entrar, ver solo lo suyo, trabajar objetivos, evidencias, reuniones e informes.

### 4. Comodidad que no bloquea el primer ciclo

Chat que se refresca al abrir, no en vivo. Alertas solo dentro del sistema. Carga de archivos y arrastre del tablero no se probaron el 10 de noviembre. Se cierran en la validación, sin regla nueva.

## Orden

1. Publicar las tres correcciones de interfaz.
2. Implementar la consulta de Equipo para Coordinadora y Gestor, oculta al Emprendedor.
3. Implementar la constancia de entrada de Puesta en marcha y abrir el ciclo solo con ella.
4. Recorrido de aceptación con Gestor y Emprendedor.
5. Primera cohorte en producción, avisando las invitaciones por fuera.
