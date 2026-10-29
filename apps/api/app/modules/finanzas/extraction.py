"""Sugerencias de captura, nunca aprobación ni conversión de moneda."""

import base64
import binascii
import io
import re
from decimal import Decimal, InvalidOperation
from itertools import islice
from typing import Any
from xml.etree import ElementTree

from fastapi import HTTPException
from pypdf import PdfReader


def extract(name: str, encoded: str) -> dict[str, Any]:
    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(422, "Archivo inválido") from exc
    if len(data) > 6_000_000:
        raise HTTPException(413, "Extracción limitada a 6 MB; puede registrar datos manualmente")
    result: dict[str, Any] = {
        "invoice_number": "",
        "supplier": "",
        "amount": None,
        "submission_date": None,
        "description": "",
        "currency": None,
        "warning": "Sugerencias sin validar. Confirme proveedor, documento, fecha, monto y moneda; no cambia el tipo ni aprueba el trámite.",
    }
    try:
        if name.lower().endswith(".xml"):
            xml_text = data.decode("utf-8-sig")
            if "<!DOCTYPE" in xml_text.upper() or "<!ENTITY" in xml_text.upper():
                raise ValueError("Entidades XML no permitidas")
            root = ElementTree.fromstring(xml_text)

            def get(tag: str, parent: Any = root) -> str:
                return next(
                    (
                        el.text.strip()
                        for el in parent.iter()
                        if el.tag.split("}")[-1] == tag and el.text
                    ),
                    "",
                )

            emitter = next((el for el in root.iter() if el.tag.split("}")[-1] == "Emisor"), root)
            result.update(
                invoice_number=get("NumeroConsecutivo") or get("Clave"),
                supplier=get("Nombre", emitter),
                amount=get("TotalComprobante") or None,
                submission_date=get("FechaEmision")[:10] or None,
                description=get("Detalle")[:200],
                currency=get("CodigoMoneda") or None,
            )
        elif name.lower().endswith(".pdf") and data.startswith(b"%PDF"):
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise ValueError("PDF cifrado")
            text = " ".join(
                (page.extract_text() or "")[:100_000] for page in islice(reader.pages, 6)
            )
            number = re.search(r"(?:Consecutivo\s*:?\s*)(\d{20})|\b(\d{20})\b", text, re.I)
            amount = re.search(
                r"(?:Total Comprobante|Total Factura|Monto Total)\s*[:₡\s]*([\d,.]+)", text, re.I
            )
            issued = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
            result.update(
                invoice_number=next((v for v in number.groups() if v), "") if number else "",
                amount=amount.group(1).replace(",", "") if amount else None,
                submission_date=issued.group(1) if issued else None,
            )
            if "CRC" in text or "₡" in text:
                result["currency"] = "CRC"
            if not text.strip():
                result["warning"] = "PDF escaneado: sin OCR. Ingrese los datos manualmente."
        else:
            raise ValueError("Formato no admitido")
        if result["amount"]:
            amount_value = Decimal(result["amount"])
            if (
                not amount_value.is_finite()
                or amount_value <= 0
                or amount_value > Decimal("999999999999.99")
                or amount_value != amount_value.quantize(Decimal("0.01"))
            ):
                result["amount"] = None
            else:
                result["amount"] = str(amount_value.quantize(Decimal("0.01")))
        if result["currency"] != "CRC":
            result["amount"] = None
            result["warning"] += (
                " Moneda CRC no confirmada: monto no aplicado, sin conversión automática."
            )
    except (ValueError, ElementTree.ParseError, InvalidOperation) as exc:
        raise HTTPException(
            422, "No se pudo leer la factura; registre los datos manualmente"
        ) from exc
    except Exception as exc:
        raise HTTPException(422, "PDF no legible; registre los datos manualmente") from exc
    return result
