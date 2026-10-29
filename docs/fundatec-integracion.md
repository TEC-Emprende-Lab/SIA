# FUNDATEC: conciliación e integración

## Evidencia técnica

Repositorio origen `sbd-ronda3-compras`, commit
`eba39bb00ab235b47a6aab2997ebcf93cb668817`: contiene parser de `rpSituacion.xls`
(HTML, doce columnas), extensión Chrome que intercepta descargas y conciliación
en navegador. No contiene contrato OpenAPI ni cliente de API FUNDATEC.
Esto NO demuestra que FUNDATEC carezca de API. Acceso oficial: TBD.

Consulta pública realizada el 2026-10-29: se encontró la documentación del
[módulo de control presupuestario SOIN](https://erpdocs.soin.net/page34120535.html),
pero no un contrato API específico para la instalación de FUNDATEC. Los
[estados financieros FUNDATEC 2024](https://www.tec.ac.cr/sites/default/files/media/doc/ef-31122024-fundatec.pdf)
mencionan software SOIN; eso no confirma endpoints, versiones ni permisos de
integración. La API pública de Hacienda es otro servicio: no acredita acceso a
presupuesto/pagos FUNDATEC. La búsqueda pública no reemplaza consulta al proveedor.

## Entrega manual

Cargar exportación de Situación Presupuestaria y confirmar ciclo. Guardar
identificación/hash del archivo y resultado bilateral: coincidencia, diferencia,
solo SEA, solo FUNDATEC. Resolver con observación; no editar montos/estados de
trámites automáticamente ni consultar otros proyectos no autorizados.

## Puerta de decisión para API (pendiente de FUNDATEC)

Solicitar al administrador/proveedor: documentación oficial, URL sandbox,
autenticación de servicio y scopes, autorización institucional, identificadores de
proyecto/factura/pago, monedas, estados, paginación, límites, webhooks y condiciones
de tratamiento de datos. Confirmar con archivo real anonimizado el formato vigente.

Si es viable: comenzar lectura solamente, configuración server-side, secretos por
entorno, mapeo explícito proyecto/ciclo, idempotencia, reintentos y conciliación
humana antes de cualquier escritura. Probar aislamiento, expiración/revocación de
credenciales, duplicados, redondeos y caída del proveedor. Sin documentación y
autorización no se implementa API ni scraping autenticado. Extensión Chrome fuera
de alcance: la carga manual no depende de ella.
