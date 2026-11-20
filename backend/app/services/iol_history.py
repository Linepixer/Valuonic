"""
Reads IOL's "Exportar a excel" files of a CEDEAR's daily quotes and turns them into price history.

The export is an HTML table saved as .xls, with US-formatted dates (MM/DD/YYYY) and numbers (10,770.00). Anything
that does not match that exact shape is rejected rather than guessed: a misread separator turns 10,770 into 10.77
and silently ruins every chart.
"""
import re
import statistics
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone
from decimal import Decimal
from html.parser import HTMLParser
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_price import AssetPrice
from app.models.corporate_event import CorporateEvent, HOLDINGS_MULTIPLIER_TYPES

SOURCE = "iol-import"
US_NUMBER = re.compile(r"^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$")
TITLE = re.compile(r"Hist[oó]rico de cotizaciones de\s+([A-Za-z0-9.]+)", re.IGNORECASE)
# Thin CEDEAR markets make the implied dollar wander a few percent from day to day; a misread number moves it far more.
IMPLIED_DOLLAR_TOLERANCE = 0.15
JUMP_TOLERANCE = 0.25


class IolHistoryError(ValueError):
    pass


@dataclass
class IolExport:
    ticker: Optional[str]
    closes: Dict[date, float]


@dataclass
class ImportPlan:
    rows: List[tuple]
    existing_days: set
    # Days left out on request, typically a close that really traded but is not representative of the price.
    skipped_days: List[date] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    # A split moves both closes alike, so it only warns; an implied dollar out of line means a misread or mistyped
    # close in one of the files, and blocks the import.
    errors: List[str] = field(default_factory=list)

    @property
    def new_rows(self) -> List[tuple]:
        return [row for row in self.rows if row[0] not in self.existing_days]


class _TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self._row, self._cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append("".join(self._cell).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def _plain(text: str) -> str:
    text = unicodedata.normalize("NFD", text.strip().lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _fmt(day: date) -> str:
    return day.strftime("%d/%m/%Y")


def _pct(change: float) -> str:
    return f"{change * 100:+.1f}%".replace(".", ",")


def parse_iol_export(content: str, label: str) -> IolExport:
    parser = _TableParser()
    parser.feed(content)
    if not parser.rows:
        raise IolHistoryError(f"{label}: no tiene ninguna tabla. ¿Es el archivo de 'Exportar a excel' de IOL?")

    header = [_plain(cell) for cell in parser.rows[0]]
    date_col = next((i for i, name in enumerate(header) if name.startswith("fecha")), None)
    close_col = header.index("cierre") if "cierre" in header else None
    if date_col is None or close_col is None:
        raise IolHistoryError(f"{label}: no encontré las columnas 'Fecha Cotización' y 'Cierre'.")

    closes: Dict[date, float] = {}
    for line, row in enumerate(parser.rows[1:], start=2):
        if len(row) <= max(date_col, close_col):
            raise IolHistoryError(f"{label}, fila {line}: le faltan columnas.")
        raw_date, raw_close = row[date_col], row[close_col]
        try:
            day = datetime.strptime(raw_date, "%m/%d/%Y").date()
        except ValueError:
            raise IolHistoryError(f"{label}, fila {line}: fecha '{raw_date}' no está en formato mes/día/año.")
        if not US_NUMBER.match(raw_close):
            raise IolHistoryError(f"{label}, fila {line}: precio '{raw_close}' no tiene el formato esperado (10,770.00).")
        close = float(raw_close.replace(",", ""))
        if close <= 0:
            raise IolHistoryError(f"{label}, fila {line}: el cierre del {_fmt(day)} es {raw_close}.")
        if day in closes:
            raise IolHistoryError(f"{label}: el {_fmt(day)} aparece dos veces.")
        closes[day] = close

    if not closes:
        raise IolHistoryError(f"{label}: la tabla no tiene cotizaciones.")
    title = TITLE.search(content)
    return IolExport(ticker=title.group(1).upper() if title else None, closes=closes)


def _neighbour_median(values: List[float], i: int) -> float:
    window = values[max(0, i - 5):i] + values[i + 1:i + 6]
    return statistics.median(window) if window else values[i]


def plan_import(db: Session, asset: Asset, ars: IolExport, usd: IolExport, skip_days: frozenset = frozenset()) -> ImportPlan:
    # Skipped days leave both files before any check, so they neither need to match nor count as a neighbour.
    ars_closes = {day: close for day, close in ars.closes.items() if day not in skip_days}
    usd_closes = {day: close for day, close in usd.closes.items() if day not in skip_days}
    only_ars = sorted(set(ars_closes) - set(usd_closes))
    only_usd = sorted(set(usd_closes) - set(ars_closes))
    if only_ars or only_usd:
        detail = []
        if only_ars:
            detail.append(f"{len(only_ars)} solo en pesos (ej. {_fmt(only_ars[0])})")
        if only_usd:
            detail.append(f"{len(only_usd)} solo en dólares (ej. {_fmt(only_usd[0])})")
        raise IolHistoryError("Los archivos no tienen las mismas fechas: " + ", ".join(detail) + ". Exportá ambos con el mismo rango.")

    days = sorted(ars_closes)
    rows = [(day, ars_closes[day], usd_closes[day]) for day in days]
    existing_days = {
        ts.date() for (ts,) in db.query(AssetPrice.timestamp).filter(AssetPrice.asset_id == asset.id)
    }
    in_files = set(ars.closes) | set(usd.closes)
    plan = ImportPlan(rows=rows, existing_days=existing_days, skipped_days=sorted(skip_days & in_files))
    for day in sorted(skip_days - in_files):
        plan.warnings.append(f"{_fmt(day)}: pediste omitirlo, pero no está en los archivos. ¿Es la fecha correcta?")

    event_days = {
        ts.date() for (ts,) in db.query(CorporateEvent.timestamp).filter(
            CorporateEvent.asset_id == asset.id, CorporateEvent.type.in_(HOLDINGS_MULTIPLIER_TYPES)
        )
    }
    for (prev_day, prev_ars, prev_usd), (day, cur_ars, cur_usd) in zip(rows, rows[1:]):
        ars_change, usd_change = cur_ars / prev_ars - 1, cur_usd / prev_usd - 1
        if abs(ars_change) > JUMP_TOLERANCE or abs(usd_change) > JUMP_TOLERANCE:
            note = (
                "coincide con un evento registrado en Admin."
                if day in event_days
                else "si fue un split o un cambio de ratio, registralo en Admin."
            )
            plan.warnings.append(
                f"{_fmt(day)}: pesos {_pct(ars_change)} y dólares {_pct(usd_change)} respecto del "
                f"{_fmt(prev_day)}; {note}"
            )

    implied = [row[1] / row[2] for row in rows]
    for i, (day, _, _) in enumerate(rows):
        reference = _neighbour_median(implied, i)
        deviation = implied[i] / reference - 1
        if abs(deviation) > IMPLIED_DOLLAR_TOLERANCE:
            plan.errors.append(
                f"{_fmt(day)}: el dólar implícito (pesos ÷ dólares) da {implied[i]:.1f}".replace(".", ",") + f", {_pct(deviation)} "
                f"contra los días vecinos. Revisá ese día en los dos archivos."
            )
    return plan


def apply_import(db: Session, asset: Asset, plan: ImportPlan) -> int:
    for day, close_ars, close_usd in plan.new_rows:
        db.add(AssetPrice(
            asset_id=asset.id,
            timestamp=datetime.combine(day, time.min, tzinfo=timezone.utc),
            price_usd=Decimal(str(close_usd)),
            price_ars=Decimal(str(close_ars)),
            source=SOURCE,
        ))
    db.commit()
    return len(plan.new_rows)
