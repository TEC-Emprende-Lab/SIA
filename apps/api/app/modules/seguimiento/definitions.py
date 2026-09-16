"""Fixed, source-derived canvas v1. No user-configurable catalog permissions."""

from uuid import NAMESPACE_URL, uuid5

AREAS: dict[str, list[tuple[str, str, str]]] = {
    "Prototipado": [
        ("identity", "Identidad y dirección estratégica", "Estatutos, misión y visión."),
        ("business-model", "Modelo de negocio", "Forma de crear, entregar y capturar valor."),
        (
            "segmented-market",
            "Mercado segmentado",
            "Segmentos priorizados y comprensión de sus necesidades.",
        ),
        ("channels", "Canales definidos", "Canales para llegar a clientes y aliados."),
        ("mvp", "Producto mínimo viable", "Desarrollo y validación del MVP con usuarios."),
        (
            "incorporation",
            "Constitución de sociedad",
            "Formalización de la sociedad para avanzar de programa.",
        ),
    ],
    "Puesta en marcha": [
        (
            "business-model",
            "Modelo de negocio",
            "Validación y ajuste del modelo para la operación comercial.",
        ),
        (
            "brand-channels",
            "Marca y canales",
            "Branding y canales definidos para llegar al mercado.",
        ),
        (
            "marketing",
            "Marketing y comercialización",
            "Plan básico de marketing y ejecución comercial.",
        ),
        (
            "intellectual-property",
            "Protección de propiedad intelectual",
            "Protección y gestión de activos intelectuales aplicables.",
        ),
        (
            "operations",
            "Formalización y operaciones",
            "Constitución de sociedad y procesos operativos.",
        ),
        (
            "funding",
            "Financiamiento",
            "Plan de financiamiento para sostener la operación y el crecimiento.",
        ),
    ],
}


def definition_id(program: str, area: str = "canvas") -> str:
    return str(uuid5(NAMESPACE_URL, f"sia:canvas:{program}:1:{area}"))
