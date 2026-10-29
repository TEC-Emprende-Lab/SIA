"""Checklists v1; la instancia se copia al crear cada trámite."""

COMMON = {
    "morosidad": "Morosidad",
    "justificacion": "Justificación",
    "detalle": "Detalle",
    "fechas": "Fechas",
    "monto": "Monto",
    "colones": "Colones",
}
CHECKLISTS = {
    "factura": {
        **COMMON,
        "documento": "Número de factura",
        "fundatec": "A nombre de FUNDATEC",
        "minuta": "Minuta",
    },
    "reintegro": {
        **COMMON,
        "recibo": "Recibo / factura",
        "beneficiario": "A nombre del beneficiario",
    },
    "uso_tc": {**COMMON, "formulario_tc": "Formulario de uso de tarjeta"},
    "comision_bancaria": {"fechas": "Fecha", "monto": "Monto", "colones": "Colones"},
    "pago_contrato": {
        **COMMON,
        "contrato": "Número de contrato",
        "beneficiario": "Beneficiario",
        "minuta": "Minuta",
    },
}
LABELS = {
    "factura": "Compra por OC / factura",
    "reintegro": "Reintegro",
    "uso_tc": "Uso de tarjeta de crédito",
    "comision_bancaria": "Comisión bancaria",
    "pago_contrato": "Pago de contrato",
}
