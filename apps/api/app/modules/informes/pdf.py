"""PDF del informe aprobado.

No define una plantilla nueva. Vuelca la narrativa y la composición que ya
están en la instantánea. Lo que no viene en esa instantánea se escribe como
``Pendiente de completar``.
"""

from collections.abc import Callable
from typing import Any

from app.models.informes import TechnicalReport

_MISSING = "Pendiente de completar"
_PAGE_LINES = 44


def render_report_pdf(report: TechnicalReport) -> bytes:
    return _pdf(_pages(_lines(report)))


def _lines(report: TechnicalReport) -> list[str]:
    lines = [
        f"Informe {report.kind} · versión {report.version}",
        f"Emprendimiento {report.entrepreneurship_id}",
        f"Ciclo {report.cycle_id}",
        f"Período {report.period_start} – {report.period_end}",
        f"Estado {report.status}",
        "Narrativa",
        _text(report.narrative),
    ]
    composition = report.composition if isinstance(report.composition, dict) else {}
    known = {
        "objectives": ("Objetivos", _objective),
        "activities_completed": ("Actividades completadas", _activity),
        "evidence": ("Evidencias", _evidence),
        "minutes_approved": ("Minutas aprobadas", _minutes),
        "agreements": ("Acuerdos", _agreement),
        "finances": ("Finanzas", _finances),
    }
    for key, (label, formatter) in known.items():
        lines.extend(_section(label, composition.get(key), formatter))
    for key, value in composition.items():
        if key not in known:
            lines.extend(_section(str(key), value, _plain))
    return lines


def _section(label: str, value: Any, formatter: Callable[[Any], str]) -> list[str]:
    lines = [label]
    if isinstance(value, list):
        lines.extend(formatter(item) for item in value)
        return lines
    lines.append(formatter(value))
    return lines


def _objective(value: Any) -> str:
    if not isinstance(value, dict):
        return _plain(value)
    return (
        f"{_text(value.get('title'))} · {_text(value.get('id'))} · "
        f"área {_text(value.get('area_id'))} · entregable {_text(value.get('deliverable'))}"
    )


def _activity(value: Any) -> str:
    if not isinstance(value, dict):
        return _plain(value)
    return (
        f"{_text(value.get('title'))} · {_text(value.get('id'))} · "
        f"objetivo {_text(value.get('objective_id'))} · "
        f"completada {_text(value.get('completed_at'))}"
    )


def _evidence(value: Any) -> str:
    if not isinstance(value, dict):
        return _plain(value)
    reference = value.get("url") or value.get("document_id")
    return (
        f"{_text(value.get('title'))} · {_text(value.get('id'))} · "
        f"{_text(value.get('kind'))} · actividad {_text(value.get('activity_id'))} · "
        f"referencia {_text(reference)}"
    )


def _minutes(value: Any) -> str:
    if not isinstance(value, dict):
        return _plain(value)
    return (
        f"{_text(value.get('id'))} · reunión {_text(value.get('meeting_id'))} · "
        f"aprobada {_text(value.get('approved_at'))}"
    )


def _agreement(value: Any) -> str:
    if not isinstance(value, dict):
        return _plain(value)
    return (
        f"{_text(value.get('description'))} · {_text(value.get('id'))} · "
        f"reunión {_text(value.get('meeting_id'))} · "
        f"responsable {_text(value.get('responsible_id'))} · "
        f"vence {_text(value.get('due_date'))}"
    )


def _finances(value: Any) -> str:
    if not isinstance(value, dict):
        return _MISSING
    detail = value.get("detail")
    status = _text(value.get("status"))
    return status if not detail else f"{status}. {_text(detail)}"


def _plain(value: Any) -> str:
    if isinstance(value, dict):
        return "; ".join(f"{key} {_text(item)}" for key, item in value.items()) or _MISSING
    return _text(value)


def _text(value: Any) -> str:
    if value is None:
        return _MISSING
    text = " ".join(str(value).split())
    return text or _MISSING


def _pages(lines: list[str]) -> list[list[str]]:
    wrapped: list[str] = []
    for line in lines:
        wrapped.extend(_wrap(line))
    return [
        wrapped[index : index + _PAGE_LINES] for index in range(0, len(wrapped), _PAGE_LINES)
    ] or [[_MISSING]]


def _wrap(line: str, width: int = 85) -> list[str]:
    words = line.split()
    if not words:
        return [""]
    rows: list[str] = []
    current = ""
    for word in words:
        while len(word) > width:
            rows.append(word[:width])
            word = word[width:]
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= width:
            current = candidate
        else:
            rows.append(current)
            current = word
    if current:
        rows.append(current)
    return rows


def _pages_objects(pages: list[list[str]]) -> list[bytes]:
    font_id = 3 + len(pages) * 2
    page_ids = [3 + index * 2 for index in range(len(pages))]
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{' '.join(f'{page} 0 R' for page in page_ids)}] /Count {len(pages)} >>".encode(),
    ]
    for index, lines in enumerate(pages):
        content_id = page_ids[index] + 1
        objects.append(
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Contents {content_id} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> >>"
            ).encode()
        )
        stream = _stream(lines)
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    objects.append(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    return objects


def _stream(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 11 Tf", "54 740 Td", "14 TL"]
    commands.extend(f"({_literal(line)}) Tj T*" for line in lines)
    commands.append("ET")
    return ("\n".join(commands) + "\n").encode("ascii")


def _literal(value: str) -> str:
    encoded = value.encode("cp1252", errors="replace")
    chars: list[str] = []
    for byte in encoded:
        if byte in {0x28, 0x29, 0x5C}:
            chars.append(f"\\{chr(byte)}")
        elif 32 <= byte <= 126:
            chars.append(chr(byte))
        else:
            chars.append(f"\\{byte:03o}")
    return "".join(chars)


def _pdf(pages: list[list[str]]) -> bytes:
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    parts = [header]
    offsets = [0]
    for number, body in enumerate(_pages_objects(pages), start=1):
        offsets.append(sum(len(part) for part in parts))
        parts.append(f"{number} 0 obj\n".encode("ascii"))
        parts.append(body)
        parts.append(b"\nendobj\n")
    xref_at = sum(len(part) for part in parts)
    size = len(offsets)
    xref = [f"xref\n0 {size}\n".encode("ascii"), b"0000000000 65535 f \n"]
    xref.extend(f"{offset:010d} 00000 n \n".encode("ascii") for offset in offsets[1:])
    trailer = f"trailer\n<< /Size {size} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n".encode()
    return b"".join([*parts, *xref, trailer])
