"""Lectura pasiva de rpSituacion: no ejecuta HTML, macros ni solicitudes externas."""

import re
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser

from fastapi import HTTPException


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.row: list[str] = []
        self.cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self.row = []
        if tag == "td":
            self.cell = []

    def handle_data(self, data: str) -> None:
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "td" and self.cell is not None:
            self.row.append(" ".join(" ".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row:
            self.rows.append(self.row)
            self.row = []


def parse_report(html: str) -> tuple[str, dict[str, Decimal]]:
    parser = TableParser()
    parser.feed(html)
    reference = re.search(r"Proyecto:\s*([^<]{1,300})", html, re.I)
    amounts: dict[str, Decimal] = {}
    for row in parser.rows:
        if len(row) != 12 or not re.fullmatch(r"\d{2}/\d{2}/\d{4}", row[5]):
            continue
        description = row[4]
        if re.search(r"comisi[oó]n|traslado", description, re.I):
            continue
        if re.fullmatch(r"\d{2,4}", row[1].strip()) and not re.search(
            r"factura|fact#", description, re.I
        ):
            continue  # ingresos contables no son compras
        invoice = re.search(r"(?:Factura#|FACT#)\s*([0-9]+)|\b([0-9]{15,20})\b", description, re.I)
        number = (
            next((v for v in invoice.groups() if v), "")
            if invoice
            else row[1].split("(")[0].strip()
        )
        if not number:
            continue
        try:
            amount = Decimal(row[7].replace(",", "").strip())
            if not amount.is_finite() or amount != amount.quantize(Decimal("0.01")):
                raise InvalidOperation
        except InvalidOperation as exc:
            raise HTTPException(
                422, "Monto ambiguo en FUNDATEC; revise el formato del archivo"
            ) from exc
        amounts[number] = amounts.get(number, Decimal(0)) + abs(amount)
    if not amounts:
        raise HTTPException(422, "No se encontraron movimientos conciliables en rpSituacion")
    return reference.group(
        1
    ).strip() if reference else "No identificado; ciclo confirmado manualmente", amounts
