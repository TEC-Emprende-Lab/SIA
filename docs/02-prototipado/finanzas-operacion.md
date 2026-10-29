# Finanzas operativas — decisión de ejecución 2026-10-29

La instrucción de ejecutar el plan de réplica de `TEC-Emprende-Lab/sbd-ronda3-compras`
confirma los cinco tipos y los flujos propuestos. No autoriza importar datos ni
acceder a la base de origen. Fuente examinada: commit `eba39bb00ab235b47a6aab2997ebcf93cb668817`.

## Alcance y responsabilidades

Solo Prototipado. Puesta en marcha continúa bloqueada. Roles: Emprendedor,
Gestor asignado y Coordinadora; no se añade RevisorFinanciero.
Todos pueden consultar el ciclo autorizado, crear un borrador, adjuntar documentos
y enviarlo. El Emprendedor solo edita/envía sus propios borradores. Gestor y
Coordinadora revisan, devuelven correcciones, validan internamente y registran
FUNDATEC. Solo Coordinadora registra ejecución, anula y aprueba cambios entre
partidas. Los permisos adicionales de Gestor y solicitudes presupuestarias de
Emprendedor continúan TBD y se deniegan.

## Tipos y estados

Tipos: `factura` (compra por OC/factura), `reintegro`, `uso_tc`,
`comision_bancaria`, `pago_contrato`. No almacenar números completos de tarjeta,
CVV, credenciales bancarias ni credenciales FUNDATEC.

Flujo: `draft → submitted → validated → fundatec → executed`.
`submitted → correction_requested → submitted` permite corregir el mismo trámite
con revisión optimista e historial. Gestor/Coordinadora puede rechazar desde
submitted/validated. Coordinadora puede anular un trámite no ejecutado; nunca
borrar o mover registros entre emprendimientos. Ejecutados son inmutables.
Comisiones pueden pasar de validación a ejecución por Coordinadora sin forzar OC.
Cada transición requiere observación, revisión esperada y actor autenticado.
La validación requiere confirmación humana y checklist completo, no constituye
confirmación de pago. Las notas nunca afirman una aprobación automáticamente.

Checklists v1 derivados del origen: factura (morosidad, justificación, documento,
a nombre FUNDATEC, detalle, fechas, monto, minuta, colones); reintegro (morosidad,
justificación, recibo, beneficiario, detalle, fechas, monto, colones); tarjeta
(morosidad, justificación, formulario TC, detalle, fechas, monto, colones);
comisión (fecha, monto, colones); contrato (morosidad, justificación, contrato,
beneficiario, detalle, fechas, monto, minuta, colones). Son instantáneas por trámite.

## Presupuesto

Coordinadora registra partidas y montos aprobados con justificación. No se siembra
un catálogo oficial: sigue TBD. Gestor/Coordinadora solicitan traslado y solo
Coordinadora lo aprueba/rechaza; origen/destino pertenecen al mismo ciclo.
No se reduce una partida por debajo de lo ya ejecutado.

Ejecutado = suma de trámites `executed`; pendiente = suma de submitted,
correction_requested, validated y fundatec (indicador informativo, NO reserva).
Saldo sobre ejecutado = asignado − ejecutado; porcentaje = ejecutado/asignado.
**Disponible operativo/comprometido y bloqueo por reservas siguen TBD**: se devuelven
como null, no se presenta saldo sobre ejecutado como dinero libre para gastar.
No se descuenta simultáneamente solicitud y factura: la factura es respaldo del
mismo trámite. Moneda de esta réplica: CRC, sin conversión automática.

## Documentos, duplicados y conciliación

Archivos privados mediante documents/R2, sin URL pública persistida. XML/PDF solo
prellenan: no validan autenticidad, moneda ni modalidad. Límites globales de subida
siguen TBD. Se rechaza repetición exacta de proveedor normalizado + número en el
ciclo (salvo rechazados/anulados); proveedor+monto es advertencia para revisión.
No revelar información de ciclos ajenos al buscar duplicados.

Conciliación manual de HTML exportado como `.xls`, sin ejecutar HTML ni macros.
Se conserva hash, nombre, resultados y resoluciones; requiere confirmar el ciclo
destino, no mueve trámites ni aprueba pagos. Compara en ambas direcciones y
conserva diferencias exactas en centavos; tolerancia automática sigue TBD.
Investigación de API externa separada; nunca automatizar login ni asumir API.

## Historias y aceptación

Amplía US-PRO-003 (ejecución por partida sin doble descuento) y US-PRO-004 (fuentes
financieras inmutables al aprobar informe). US-PRO-007: registrar cinco tipos y
enviar/revisar/corregir con checklist y actor/fecha/motivo. US-PRO-008: conciliar
manualmente y resolver diferencias conservando fuente. US-PRO-009: trasladar
presupuesto con aprobación humana y auditoría. US-PRO-010: consultar/exportar
reporte operativo filtrado por período/tipo/estado sin acceso cruzado.

Aceptación transversal: backend autoriza cada acción, FK mantienen alcance,
revisión obsoleta devuelve 409, dinero decimal, historial sin borrado, datos
ausentes explícitos y ninguna aprobación automática. No se importa Ronda 3.
