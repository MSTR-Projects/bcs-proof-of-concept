"""Wipe all controle-related data and seed one deep demo flow.

The flow is a full chain: klant -> global value group -> sample files
(PDF + spreadsheet) -> controles with fields, rules and rule graph ->
controle series -> run history (real extraction runs, so every seeded
rule is verified to pass).

Scenario: Maandafsluiting februari 2026 for Hoveniersbedrijf De Groene
Linde (20 medewerkers). One serie of five controles; the first checks
all 20 loonstroken in a single run. An extra correctie-loonstrook with
an uurloon below the CAO-minimum is written to sample_files only (not
part of any seeded run) for the live demo catch moment; the seeder
verifies that exactly that strook fails exactly the uurloon rule.

Generated sample files are also written to <repo>/sample_files/<klant>/ so
they can be re-uploaded manually in the Run dialogs.

Usage:
    cd backend && .venv/bin/python seed_demo_data.py
"""

import asyncio
import io
import json
import os
import random
import shutil
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl
import pdfplumber
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

import config
from models.schemas import (
    ControleCreate,
    ControleSeriesCreate,
    GlobalValue,
    GlobalValueGroupCreate,
    KlantCreate,
)
from routers.controle_series import RunSeriesRequest, run_series
from routers.controles import RunControleRequest, run_controle
from routers.spreadsheets import _parse_spreadsheet
from services.controle_series_store import save_controle_series
from services.controle_store import save_controle
from services.global_value_store import save_global_value_group
from services.klant_store import save_klant
from services.storage_backend import get_storage

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BACKEND_DIR, "storage")
SAMPLE_DIR = os.path.join(BACKEND_DIR, "..", "sample_files")

rng = random.Random(20260113)


# ════════════════════════════════════════════════════════════════════
# Clearing
# ════════════════════════════════════════════════════════════════════

def clear_all():
    """Remove all controles, runs, series, klanten, global values and files."""
    if config.STORAGE_BACKEND != "local":
        sys.exit("Seed script only supports local storage (STORAGE_BACKEND=local).")

    storage = get_storage()
    for cid in storage.list_controle_ids():
        storage.delete_controle(cid)
    for sid in storage.list_controle_series_ids():
        storage.delete_controle_series(sid)
    for kid in storage.list_klant_ids():
        storage.delete_klant(kid)
    for gid in storage.list_global_value_group_ids():
        storage.delete_global_value_group(gid)

    # Run history and file stores have no delete API; clear the local dirs.
    for sub in ("controle_runs", "controle_series_runs", "spreadsheets", "global_value_templates"):
        path = os.path.join(STORAGE_DIR, sub)
        if os.path.isdir(path):
            shutil.rmtree(path)
        os.makedirs(path, exist_ok=True)

    uploads = os.path.join(STORAGE_DIR, "uploads")
    if os.path.isdir(uploads):
        shutil.rmtree(uploads)
    os.makedirs(uploads, exist_ok=True)
    open(os.path.join(uploads, ".gitkeep"), "w").close()
    storage.save_metadata({})

    print("✓ Cleared controles, series, runs, klanten, global values, spreadsheets en uploads")


# ════════════════════════════════════════════════════════════════════
# Realistic Dutch employee data
# ════════════════════════════════════════════════════════════════════

VOORLETTERS = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "J.", "K.", "L.", "M.",
               "N.", "P.", "R.", "S.", "T.", "W.", "J.P.", "M.A.", "L.J.", "P.H.", "K.D.", "S.M."]
ACHTERNAMEN = [
    "de Vries", "Jansen", "van den Berg", "Bakker", "Visser", "Smit", "Meijer", "Mulder",
    "de Boer", "Bos", "Vos", "Peters", "Hendriks", "van Dijk", "van der Meer", "Dekker",
    "Brouwer", "de Wit", "Dijkstra", "Smits", "de Graaf", "van der Linden", "Kok", "Jacobs",
    "de Haan", "Vermeulen", "van den Heuvel", "van der Veen", "van den Broek", "de Bruijn",
    "van der Heijden", "Schouten", "van Beek", "Willems", "van Vliet", "van de Ven",
    "Hoekstra", "Maas", "Verhoeven", "Yilmaz", "Kaya", "de Groot", "Pietersen", "Koster",
]


def make_naam():
    achternaam = rng.choice(ACHTERNAMEN)
    return f"{achternaam[0].upper()}{achternaam[1:]}, {rng.choice(VOORLETTERS)}"


# ════════════════════════════════════════════════════════════════════
# PDF generation + field region detection
# ════════════════════════════════════════════════════════════════════

_styles = getSampleStyleSheet()
_title = ParagraphStyle("t", parent=_styles["Title"], fontSize=16, spaceAfter=2, alignment=0)
_meta = ParagraphStyle("m", parent=_styles["Normal"], fontSize=9, textColor=colors.HexColor("#475569"))
_cell = ParagraphStyle("c", parent=_styles["Normal"], fontSize=8, leading=11)
_footer = ParagraphStyle("f", parent=_styles["Normal"], fontSize=7, textColor=colors.HexColor("#94a3b8"))

_TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#94a3b8")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
])

_META_STYLE = TableStyle([
    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
    ("TOPPADDING", (0, 0), (-1, -1), 2),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ("LEFTPADDING", (0, 0), (0, -1), 0),
])


def _esc(text):
    return str(text).replace("&", "&amp;").replace("<", "&lt;")


def build_pdf(path, doc_title, meta_pairs, table_title, headers, rows, note=None):
    """Build a one-page payroll report: title, label/value meta block, detail table."""
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm)
    page_width = A4[0] - 36 * mm
    meta_rows = [[f"{label}:", _esc(value)] for label, value in meta_pairs]
    detail = [headers] + [[Paragraph(_esc(c), _cell) for c in row] for row in rows]
    n = len(headers)
    wide = page_width * 0.34
    col_widths = [(page_width - wide) / (n - 1)] * (n - 1) + [wide] if n > 3 else [page_width / n] * n
    elements = [
        Paragraph("Polaris Salarisverwerking", _meta),
        Paragraph(_esc(doc_title), _title),
        Spacer(1, 4 * mm),
        Table(meta_rows, colWidths=[52 * mm, page_width - 52 * mm], style=_META_STYLE, hAlign="LEFT"),
        Spacer(1, 6 * mm),
        Paragraph(f"<b>{_esc(table_title)}</b>", _meta),
        Spacer(1, 2 * mm),
        Table(detail, colWidths=col_widths, style=_TABLE_STYLE, repeatRows=1),
    ]
    if note:
        elements += [Spacer(1, 4 * mm), Paragraph(_esc(note), _meta)]
    elements += [Spacer(1, 6 * mm),
                 Paragraph("Gegenereerd door Polaris v8.2 - fictieve demodata", _footer)]
    doc.build(elements)


def labeled_value_region(pdf_path, label, page_no=1):
    """Find the normalized region of the value printed right of 'label:' on its own line."""
    label_tokens = f"{label}:".split()
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_no - 1]
        words = sorted(page.extract_words(), key=lambda w: (w["top"], w["x0"]))
        lines: list[list[dict]] = []
        for w in words:
            if lines and abs(lines[-1][0]["top"] - w["top"]) < 2.5:
                lines[-1].append(w)
            else:
                lines.append([w])
        for line in lines:
            texts = [w["text"] for w in line]
            if texts[: len(label_tokens)] == label_tokens and len(texts) > len(label_tokens):
                vw = line[len(label_tokens):]
                x0 = min(w["x0"] for w in vw) - 1.5
                x1 = max(w["x1"] for w in vw) + 1.5
                top = min(w["top"] for w in vw) - 1.5
                bottom = max(w["bottom"] for w in vw) + 1.5
                return {
                    "page": page_no,
                    "x": x0 / page.width,
                    "y": top / page.height,
                    "width": (x1 - x0) / page.width,
                    "height": (bottom - top) / page.height,
                }
    raise ValueError(f"Label '{label}' niet gevonden in {pdf_path}")


def union_region(regions):
    """Bounding union of same-label regions across identically laid out PDFs."""
    x0 = min(r["x"] for r in regions)
    y0 = min(r["y"] for r in regions)
    x1 = max(r["x"] + r["width"] for r in regions)
    y1 = max(r["y"] + r["height"] for r in regions)
    return {"page": regions[0]["page"], "x": x0, "y": y0,
            "width": x1 - x0, "height": y1 - y0}


# ════════════════════════════════════════════════════════════════════
# File registration (uploads + spreadsheets + sample_files copies)
# ════════════════════════════════════════════════════════════════════

def register_pdf(local_path, filename, klant_slug):
    """Upload a generated PDF into storage and copy it to sample_files/."""
    storage = get_storage()
    pdf_id = str(uuid.uuid4())
    with open(local_path, "rb") as f:
        content = f.read()
    storage.upload_pdf(pdf_id, content)
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        page_count = len(pdf.pages)
    meta = storage.load_metadata()
    meta[pdf_id] = {"filename": filename, "page_count": page_count}
    storage.save_metadata(meta)

    dest = os.path.join(SAMPLE_DIR, klant_slug)
    os.makedirs(dest, exist_ok=True)
    shutil.copyfile(local_path, os.path.join(dest, filename))
    return pdf_id, page_count


def register_spreadsheet(headers, rows, filename, klant_slug):
    """Create an xlsx, upload it into storage and copy it to sample_files/."""
    storage = get_storage()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    content = buf.getvalue()

    ss_id = str(uuid.uuid4())
    storage.upload_spreadsheet(ss_id, content)
    grid = _parse_spreadsheet(content)
    storage.save_spreadsheet_grid(ss_id, json.dumps(grid))

    dest = os.path.join(SAMPLE_DIR, klant_slug)
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, filename), "wb") as f:
        f.write(content)

    sheet_data = {"headers": grid["headers"], "rows": grid["rows"],
                  "rowCount": grid["row_count"], "colCount": grid["col_count"]}
    return ss_id, sheet_data


# ════════════════════════════════════════════════════════════════════
# Controle field + file helpers
# ════════════════════════════════════════════════════════════════════

def pdf_field(label, region):
    return {
        "id": str(uuid.uuid4()), "label": label, "type": "static",
        "anchor_mode": "static", "anchors": [], "value_region": region,
        "extraction_mode": "word", "chain": [], "source": "a",
    }


def cell_field(label, col, row):
    return {
        "id": str(uuid.uuid4()), "label": label, "type": "cell",
        "anchor_mode": "static", "anchors": [],
        "value_region": {"page": 1, "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0},
        "extraction_mode": "word", "chain": [], "source": "a",
        "cell_ref": {"col": col, "row": row},
    }


def pdf_file(label, pdf_id, filename, page_count, fields):
    return {"id": str(uuid.uuid4()), "label": label, "fileType": "pdf",
            "pdfId": pdf_id, "pdfFilename": filename, "pageCount": page_count,
            "fields": fields}


def spreadsheet_file(label, ss_id, filename, sheet_data, fields):
    return {"id": str(uuid.uuid4()), "label": label, "fileType": "spreadsheet",
            "spreadsheetId": ss_id, "spreadsheetFilename": filename,
            "sheetData": sheet_data, "fields": fields}


# ════════════════════════════════════════════════════════════════════
# Rule graph builder (mirrors frontend serializeGraph semantics)
# ════════════════════════════════════════════════════════════════════

_OPERATOR_LABELS = {"equals": "==", "not_equals": "!=", "greater_or_equal": ">=",
                    "less_or_equal": "<=", "greater_than": ">", "less_than": "<"}


class RuleBuilder:
    """Builds TemplateRule[], ComputedField[] and the React Flow ruleGraph together."""

    def __init__(self, controle_id):
        self.controle_id = controle_id
        self.nodes: list[dict] = []
        self.edges: list[dict] = []
        self.rules: list[dict] = []
        self.computed_fields: list[dict] = []
        self._col_y = {0: 0, 300: 0, 620: 0}

    def _place(self, x, w, h):
        y = self._col_y.setdefault(x, 0)
        self._col_y[x] += h + 30
        return {"x": x, "y": y}, {"width": w, "height": h}

    def _add_node(self, node_id, node_type, data, x, w=140, h=63):
        position, measured = self._place(x, w, h)
        self.nodes.append({"id": node_id, "type": node_type, "position": position,
                           "data": data, "measured": measured})

    def _add_edge(self, source, target, handle=None):
        edge = {
            "animated": True, "selectable": True, "style": {"strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "width": 16, "height": 16},
            "source": source, "target": target,
            "id": f"xy-edge__{source}{('-' + handle) if handle else ''}-{target}",
        }
        if handle:
            edge["targetHandle"] = handle
        self.edges.append(edge)

    # -- input nodes (return (node_id, operand) handles) --

    def field_input(self, field, file):
        node_id = f"field-{field['id']}"
        self._add_node(node_id, "field_input", {
            "label": field["label"], "nodeType": "field_input",
            "fieldRef": {"field_label": field["label"], "file_id": file["id"], "file_label": file["label"]},
            "literalDatatype": "string", "fieldType": field["type"],
        }, x=0)
        return node_id, {"type": "field_ref", "ref": {"field_label": field["label"]}}

    def ss_column(self, file, col_idx):
        col_label = file["sheetData"]["headers"][col_idx]
        node_id = f"field-ss-{file['id']}-col-{col_idx}"
        self._add_node(node_id, "field_input", {
            "label": col_label, "nodeType": "field_input",
            "fieldRef": {"field_label": col_label, "file_id": file["id"], "file_label": file["label"]},
            "literalDatatype": "string", "fieldType": "cell_range",
        }, x=0)
        return node_id, {"type": "field_ref", "ref": {"field_label": col_label}}

    def global_value(self, group_id, group_name, gv: GlobalValue):
        node_id = str(uuid.uuid4())
        self._add_node(node_id, "global_value_input", {
            "label": gv.name, "nodeType": "global_value_input",
            "globalGroupId": group_id, "globalValueId": gv.id,
            "groupName": group_name, "globalDataType": gv.dataType, "lastValue": gv.value,
        }, x=0, w=180, h=80)
        return node_id, {"type": "global_value", "global_group_id": group_id, "global_value_id": gv.id}

    def literal(self, value, datatype="string"):
        node_id = str(uuid.uuid4())
        self._add_node(node_id, "literal_input", {
            "label": value, "nodeType": "literal_input",
            "literalValue": value, "literalDatatype": datatype,
        }, x=0, w=120, h=55)
        return node_id, {"type": "literal", "value": value, "datatype": datatype}

    # -- rule nodes --

    def aggregate(self, source, operation, name):
        """operation: 'sum' | 'average' | 'count' | 'min' | 'max'"""
        node_id = str(uuid.uuid4())
        src_id, src_operand = source
        self._add_node(node_id, "table_aggregate", {
            "label": f"{operation.capitalize()}", "nodeType": "table_aggregate",
            "aggregateOperation": operation, "outputLabel": name,
        }, x=300, w=90, h=58)
        self._add_edge(src_id, node_id)
        self.rules.append({
            "id": node_id, "name": name, "type": "computation", "enabled": True,
            "computation": {"operation": f"agg_{operation}", "operands": [src_operand],
                            "output_label": name},
        })
        self.computed_fields.append({"id": node_id, "label": name,
                                     "template_id": self.controle_id, "rule_id": node_id})
        return node_id, {"type": "computed_ref", "computed_id": node_id}

    def comparison(self, name, a, b, operator="equals"):
        node_id = str(uuid.uuid4())
        a_id, a_operand = a
        b_id, b_operand = b
        self._add_node(node_id, "comparison", {
            "label": _OPERATOR_LABELS.get(operator, operator), "nodeType": "comparison",
            "comparisonOperator": operator, "outputLabel": name,
        }, x=620, w=90, h=53)
        self._add_edge(a_id, node_id, "a")
        self._add_edge(b_id, node_id, "b")
        self.rules.append({
            "id": node_id, "name": name, "type": "validation", "enabled": True,
            "validation": {"rule_type": "compare_field", "operand_a": a_operand,
                           "operand_b": b_operand, "operator": operator},
        })
        self.computed_fields.append({"id": node_id, "label": name,
                                     "template_id": self.controle_id, "rule_id": node_id})

    def validation(self, name, source, rule_type="not_empty"):
        node_id = str(uuid.uuid4())
        src_id, src_operand = source
        self._add_node(node_id, "validation", {
            "label": rule_type.replace("_", " ").capitalize(), "nodeType": "validation",
            "validationRuleType": rule_type, "outputLabel": name,
        }, x=620, w=90, h=53)
        self._add_edge(src_id, node_id)
        self.rules.append({
            "id": node_id, "name": name, "type": "validation", "enabled": True,
            "validation": {"rule_type": rule_type, "operand_a": src_operand},
        })
        self.computed_fields.append({"id": node_id, "label": name,
                                     "template_id": self.controle_id, "rule_id": node_id})

    def result(self):
        return {"rules": self.rules, "computedFields": self.computed_fields,
                "ruleGraph": {"nodes": self.nodes, "edges": self.edges}}


# ════════════════════════════════════════════════════════════════════
# Entity helpers
# ════════════════════════════════════════════════════════════════════

def seed_klant(name, medewerker_count):
    klant_id = str(uuid.uuid4())
    save_klant(klant_id, KlantCreate(name=name, medewerkerCount=medewerker_count))
    return klant_id


def seed_global_group(name, values):
    """values: list of (name, dataType, value) tuples."""
    group_id = str(uuid.uuid4())
    gvs = [GlobalValue(id=str(uuid.uuid4()), name=n, dataType=dt, value=str(v))
           for n, dt, v in values]
    save_global_value_group(group_id, GlobalValueGroupCreate(name=name, values=gvs, mode="manual"))
    return group_id, {gv.name: gv for gv in gvs}


def seed_controle(controle_id, name, klant_id, klant_name, created_by, files, rule_result):
    save_controle(controle_id, ControleCreate(
        name=name, status="published", files=files,
        rules=rule_result["rules"], computedFields=rule_result["computedFields"],
        ruleGraph=rule_result["ruleGraph"],
        klantId=klant_id, klantName=klant_name, createdBy=created_by,
    ))
    return controle_id


def seed_series(name, klant_id, klant_name, steps):
    """steps: list of (controle_id, controle_name, condition)."""
    series_id = str(uuid.uuid4())
    save_controle_series(series_id, ControleSeriesCreate(
        name=name, klantId=klant_id, klantName=klant_name,
        steps=[{"id": str(uuid.uuid4()), "order": i, "controleId": cid,
                "controleName": cname, "condition": cond}
               for i, (cid, cname, cond) in enumerate(steps)],
    ))
    return series_id


def scratch_pdf_path(filename):
    tmp = os.path.join(BACKEND_DIR, "storage", "uploads", f"_tmp_{filename}")
    return tmp


def make_report(filename, klant_slug, doc_title, meta_pairs, table_title, headers, rows, note=None):
    """Generate a PDF, register it, and return (pdf_id, page_count, region_lookup)."""
    tmp = scratch_pdf_path(filename)
    build_pdf(tmp, doc_title, meta_pairs, table_title, headers, rows, note)
    pdf_id, page_count = register_pdf(tmp, filename, klant_slug)

    def region(label):
        return labeled_value_region(tmp, label)

    regions = {label: region(label) for label, _ in meta_pairs}
    os.remove(tmp)
    return pdf_id, page_count, regions


# ════════════════════════════════════════════════════════════════════
# Flow — Hoveniersbedrijf De Groene Linde (maandafsluiting februari 2026)
# ════════════════════════════════════════════════════════════════════

async def seed_flow_groene_linde():
    naam = "Hoveniersbedrijf De Groene Linde"
    slug = "hoveniersbedrijf-de-groene-linde"
    groep = "CAO Hoveniersbedrijf 2026"
    aantal = 20
    periode = "2026-02"
    lh_nummer = "8456.78.901.L01"
    klant_id = seed_klant(naam, aantal)

    # -- Medewerkers: integer bruto, uurloon boven CAO-minimum (14.06) --
    functies = ["Hovenier", "Voorman buitendienst", "Grondwerker", "Boomverzorger",
                "Machinist", "Tuinontwerper", "Administratief medewerker"]
    medewerkers = []
    for i in range(aantal):
        uren = rng.choice([24, 28, 32, 36, 40])
        min_bruto = (int(uren * 4.33 * 14.30) // 50) * 50 + 50   # uurloon >= 14.30 > 14.06
        bruto = rng.randrange(min_bruto, min_bruto + 1200, 50)
        medewerkers.append({
            "persnr": 50101 + i, "naam": make_naam(), "functie": rng.choice(functies),
            "uren": uren, "uurloon": round(bruto / (uren * 4.33), 2), "bruto": bruto,
            "vg_cents": bruto * 8,   # 8% van bruto, exact in centen
        })
    loonsom = sum(m["bruto"] for m in medewerkers)
    lh_totaal = round(loonsom * 0.37)
    vg_totaal_cents = sum(m["vg_cents"] for m in medewerkers)
    vg_totaal = f"{vg_totaal_cents / 100:.2f}"

    # -- Global values --
    group_id, gv = seed_global_group(groep, [
        ("Loonheffingsnummer", "text", lh_nummer),
        ("Aantal medewerkers", "number", aantal),
        ("CAO minimumuurloon", "number", "14.06"),
        ("Vakantiegeldpercentage", "number", 8),
        ("Bruto loonsom februari", "number", loonsom),
        ("Totaal vakantiegeldreservering", "number", vg_totaal),
    ])

    # -- 20 loonstroken + 1 correctie-strook --
    def strook_meta(m):
        return [
            ("Werkgever", f"{naam} (5012)"),
            ("Loonheffingsnummer", lh_nummer),
            ("Periode", periode),
            ("Personeelsnummer", m["persnr"]),
            ("Medewerker", m["naam"]),
            ("Uren per week", m["uren"]),
            ("Uurloon (EUR)", f"{m['uurloon']:.2f}"),
            ("Bruto maandsalaris (EUR)", m["bruto"]),
            ("Vakantiegeldpercentage", 8),
            ("Vakantiegeldreservering (EUR)", f"{m['vg_cents'] / 100:.2f}"),
        ]

    def strook_rows(m):
        heffing = round(m["bruto"] * 0.37)
        pensioen = round(m["bruto"] * 0.045)
        return [
            ["100", "Bruto maandsalaris", f"{m['uren']} uur/week", f"{m['bruto']}"],
            ["310", "Vakantiegeldreservering 8%", "Bruto loon", f"{m['vg_cents'] / 100:.2f}"],
            ["410", "Pensioenpremie werknemer", "Grondslag", f"-{pensioen}"],
            ["500", "Loonheffing", "Tabel wit", f"-{heffing}"],
            ["900", "Netto uit te betalen", "", f"{m['bruto'] - heffing - pensioen}"],
        ]

    STROOK_LABELS = ["Periode", "Loonheffingsnummer", "Uurloon (EUR)",
                     "Bruto maandsalaris (EUR)", "Vakantiegeldpercentage"]
    STROOK_HEADERS = ["Code", "Omschrijving", "Grondslag", "Bedrag (EUR)"]
    STROOK_NOTE = "Verloond volgens CAO Hoveniersbedrijf, loontijdvak maand."

    region_sets: dict[str, list[dict]] = {lbl: [] for lbl in STROOK_LABELS}
    strook_ids: list[tuple[str, str]] = []
    for m in medewerkers:
        filename = f"Loonstrook_2026-02_{m['persnr']}.pdf"
        tmp = scratch_pdf_path(filename)
        build_pdf(tmp, "Loonstrook februari 2026", strook_meta(m),
                  "Loonstrookregels", STROOK_HEADERS, strook_rows(m), STROOK_NOTE)
        for lbl in STROOK_LABELS:
            region_sets[lbl].append(labeled_value_region(tmp, lbl))
        pdf_id, _pages = register_pdf(tmp, filename, slug)
        strook_ids.append((pdf_id, filename))
        os.remove(tmp)

    # Correctie-strook: uurloon onder CAO-minimum; alleen in sample_files, niet in storage
    fout = dict(medewerkers[13])
    fout["uurloon"] = 12.80
    fout["bruto"] = int(12.80 * fout["uren"] * 4.33) // 10 * 10
    fout["vg_cents"] = fout["bruto"] * 8
    correctie_filename = f"Loonstrook_2026-02_{fout['persnr']}_correctie.pdf"
    correctie_path = os.path.join(SAMPLE_DIR, slug, correctie_filename)
    build_pdf(correctie_path, "Loonstrook februari 2026 (correctie)", strook_meta(fout),
              "Loonstrookregels", STROOK_HEADERS, strook_rows(fout), STROOK_NOTE)
    for lbl in STROOK_LABELS:
        region_sets[lbl].append(labeled_value_region(correctie_path, lbl))

    regions = {lbl: union_region(rs) for lbl, rs in region_sets.items()}

    # -- Controle 1: Loonstrokencontrole (1 slot, 20 stroken per run) --
    c1_id = str(uuid.uuid4())
    f_periode = pdf_field("Periode", regions["Periode"])
    f_lh = pdf_field("Loonheffingsnummer", regions["Loonheffingsnummer"])
    f_uurloon = pdf_field("Uurloon", regions["Uurloon (EUR)"])
    f_bruto = pdf_field("Bruto maandsalaris", regions["Bruto maandsalaris (EUR)"])
    f_vgpct = pdf_field("Vakantiegeldpercentage", regions["Vakantiegeldpercentage"])
    file_strook = pdf_file("Loonstrook", strook_ids[0][0], strook_ids[0][1], 1,
                           [f_periode, f_lh, f_uurloon, f_bruto, f_vgpct])

    rb = RuleBuilder(c1_id)
    n_periode = rb.field_input(f_periode, file_strook)
    n_lh = rb.field_input(f_lh, file_strook)
    n_uurloon = rb.field_input(f_uurloon, file_strook)
    rb.field_input(f_bruto, file_strook)
    n_vgpct = rb.field_input(f_vgpct, file_strook)
    g_lh = rb.global_value(group_id, groep, gv["Loonheffingsnummer"])
    g_min = rb.global_value(group_id, groep, gv["CAO minimumuurloon"])
    g_vgpct = rb.global_value(group_id, groep, gv["Vakantiegeldpercentage"])
    l_periode = rb.literal(periode)
    rb.comparison("Uurloon voldoet aan CAO-minimum", n_uurloon, g_min, "greater_or_equal")
    rb.comparison("Vakantiegeldpercentage conform CAO", n_vgpct, g_vgpct)
    rb.comparison("Juiste periode verloond", n_periode, l_periode)
    rb.comparison("LH-nummer komt overeen met CAO-dossier", n_lh, g_lh)
    seed_controle(c1_id, "Loonstrokencontrole", klant_id, naam,
                  "Sanne de Ruiter", [file_strook], rb.result())

    # -- Controle 2: Loonjournaal maandcontrole --
    j_filename = "Loonjournaal_2026-02_De_Groene_Linde.pdf"
    j_pdf_id, j_pages, j_regions = make_report(
        j_filename, slug, "Loonjournaal februari 2026",
        meta_pairs=[
            ("Werkgever", f"{naam} (5012)"),
            ("Periode", periode),
            ("Loonheffingsnummer", lh_nummer),
            ("Aantal medewerkers", aantal),
            ("Totaal bruto (EUR)", loonsom),
        ],
        table_title="Journaalposten",
        headers=["Grootboek", "Omschrijving", "Debet (EUR)", "Credit (EUR)"],
        rows=[
            ["4001", "Bruto lonen", f"{loonsom}", ""],
            ["4002", "Vakantiegeldreservering 8%", vg_totaal, ""],
            ["4011", "Pensioenpremie werkgever", f"{round(loonsom * 0.068)}", ""],
            ["1601", "Af te dragen loonheffing", "", f"{lh_totaal}"],
            ["1602", "Netto lonen te betalen", "", f"{loonsom - lh_totaal}"],
        ],
        note="Verloond volgens CAO Hoveniersbedrijf, loontijdvak maand.",
    )
    c2_id = str(uuid.uuid4())
    f_j_periode = pdf_field("Periode", j_regions["Periode"])
    f_j_lh = pdf_field("Loonheffingsnummer", j_regions["Loonheffingsnummer"])
    f_j_aantal = pdf_field("Aantal medewerkers", j_regions["Aantal medewerkers"])
    f_j_bruto = pdf_field("Totaal bruto", j_regions["Totaal bruto (EUR)"])
    file_journaal = pdf_file("Loonjournaal", j_pdf_id, j_filename, j_pages,
                             [f_j_periode, f_j_lh, f_j_aantal, f_j_bruto])
    rb = RuleBuilder(c2_id)
    n_periode = rb.field_input(f_j_periode, file_journaal)
    n_lh = rb.field_input(f_j_lh, file_journaal)
    n_aantal = rb.field_input(f_j_aantal, file_journaal)
    n_bruto = rb.field_input(f_j_bruto, file_journaal)
    g_lh = rb.global_value(group_id, groep, gv["Loonheffingsnummer"])
    g_aantal = rb.global_value(group_id, groep, gv["Aantal medewerkers"])
    g_loonsom = rb.global_value(group_id, groep, gv["Bruto loonsom februari"])
    l_periode = rb.literal(periode)
    rb.comparison("Loonsom sluit aan op loonstroken", n_bruto, g_loonsom)
    rb.comparison("Headcount klopt met contract", n_aantal, g_aantal)
    rb.comparison("LH-nummer komt overeen met CAO-dossier", n_lh, g_lh)
    rb.comparison("Juiste periode geboekt", n_periode, l_periode)
    seed_controle(c2_id, "Loonjournaal maandcontrole", klant_id, naam,
                  "Sanne de Ruiter", [file_journaal], rb.result())

    # -- Controle 3: Medewerkersbestand aansluiting (spreadsheet) --
    ss_filename = "Medewerkers_2026-02_De_Groene_Linde.xlsx"
    ss_id, sheet_data = register_spreadsheet(
        ["Persnr", "Naam", "Functie", "Uren per week", "Uurloon", "Bruto maandsalaris"],
        [[m["persnr"], m["naam"], m["functie"], m["uren"], m["uurloon"], m["bruto"]]
         for m in medewerkers],
        ss_filename, slug)
    c3_id = str(uuid.uuid4())
    f_eerste = cell_field("Eerste personeelsnummer", 0, 0)
    file_medewerkers = spreadsheet_file("Medewerkersbestand", ss_id, ss_filename,
                                        sheet_data, [f_eerste])
    rb = RuleBuilder(c3_id)
    c_bruto = rb.ss_column(file_medewerkers, 5)
    c_persnr = rb.ss_column(file_medewerkers, 0)
    n_eerste = rb.field_input(f_eerste, file_medewerkers)
    g_loonsom = rb.global_value(group_id, groep, gv["Bruto loonsom februari"])
    g_aantal = rb.global_value(group_id, groep, gv["Aantal medewerkers"])
    agg_som = rb.aggregate(c_bruto, "sum", "Som bruto medewerkersbestand")
    agg_count = rb.aggregate(c_persnr, "count", "Aantal medewerkers in bestand")
    rb.comparison("Loonsom sluit aan op journaal", agg_som, g_loonsom)
    rb.comparison("Headcount komt overeen met CAO-dossier", agg_count, g_aantal)
    rb.validation("Medewerkersbestand is gevuld", n_eerste, "not_empty")
    seed_controle(c3_id, "Medewerkersbestand aansluiting", klant_id, naam,
                  "Sanne de Ruiter", [file_medewerkers], rb.result())

    # -- Controle 4: Loonaangifte controle --
    a_filename = "Loonaangifte_2026-02_De_Groene_Linde.pdf"
    a_pdf_id, a_pages, a_regions = make_report(
        a_filename, slug, "Loonaangifte februari 2026",
        meta_pairs=[
            ("Werkgever", f"{naam} (5012)"),
            ("Periode", periode),
            ("Loonheffingsnummer", lh_nummer),
            ("Aantal inkomstenverhoudingen", aantal),
            ("Totaal loon loonheffing (EUR)", loonsom),
        ],
        table_title="Collectieve aangifte",
        headers=["Rubriek", "Bedrag (EUR)"],
        rows=[
            ["Totaal loon LB/PH", f"{loonsom}"],
            ["Ingehouden loonbelasting/premie volksverzekeringen", f"{lh_totaal}"],
            ["Premie WW Awf laag", f"{round(loonsom * 0.0264)}"],
            ["Werkgeversheffing Zvw", f"{round(loonsom * 0.0695)}"],
            ["Gedifferentieerde premie Whk", f"{round(loonsom * 0.0077)}"],
        ],
        note="Aangifte loonheffingen periode februari 2026, uiterste aangiftedatum 31-03-2026.",
    )
    c4_id = str(uuid.uuid4())
    f_a_periode = pdf_field("Periode", a_regions["Periode"])
    f_a_lh = pdf_field("Loonheffingsnummer", a_regions["Loonheffingsnummer"])
    f_a_ihv = pdf_field("Aantal inkomstenverhoudingen", a_regions["Aantal inkomstenverhoudingen"])
    f_a_loon = pdf_field("Totaal loon loonheffing", a_regions["Totaal loon loonheffing (EUR)"])
    file_aangifte = pdf_file("Loonaangifte", a_pdf_id, a_filename, a_pages,
                             [f_a_periode, f_a_lh, f_a_ihv, f_a_loon])
    rb = RuleBuilder(c4_id)
    n_periode = rb.field_input(f_a_periode, file_aangifte)
    n_lh = rb.field_input(f_a_lh, file_aangifte)
    n_ihv = rb.field_input(f_a_ihv, file_aangifte)
    n_loon = rb.field_input(f_a_loon, file_aangifte)
    g_lh = rb.global_value(group_id, groep, gv["Loonheffingsnummer"])
    g_aantal = rb.global_value(group_id, groep, gv["Aantal medewerkers"])
    g_loonsom = rb.global_value(group_id, groep, gv["Bruto loonsom februari"])
    rb.comparison("Aangifteloon sluit aan op journaal", n_loon, g_loonsom)
    rb.comparison("Alle inkomstenverhoudingen aangegeven", n_ihv, g_aantal)
    rb.comparison("LH-nummer komt overeen met CAO-dossier", n_lh, g_lh)
    rb.validation("Periode is ingevuld", n_periode, "not_empty")
    seed_controle(c4_id, "Loonaangifte controle", klant_id, naam,
                  "Sanne de Ruiter", [file_aangifte], rb.result())

    # -- Controle 5: Reserveringencontrole --
    r_filename = "Reserveringen_2026-02_De_Groene_Linde.pdf"
    r_pdf_id, r_pages, r_regions = make_report(
        r_filename, slug, "Reserveringenoverzicht februari 2026",
        meta_pairs=[
            ("Werkgever", f"{naam} (5012)"),
            ("Periode", periode),
            ("Totaal vakantiegeld (EUR)", vg_totaal),
            ("Negatieve saldi", "0"),
        ],
        table_title="Vakantiegeldreservering per medewerker",
        headers=["Persnr", "Naam", "Opbouw februari (EUR)", "Saldo (EUR)"],
        rows=[[str(m["persnr"]), m["naam"], f"{m['vg_cents'] / 100:.2f}",
               f"{m['vg_cents'] * 9 / 100:.2f}"] for m in medewerkers],
        note="Opbouwperiode juni 2025 t/m mei 2026; saldo na 9 maanden opbouw.",
    )
    c5_id = str(uuid.uuid4())
    f_r_periode = pdf_field("Periode", r_regions["Periode"])
    f_r_totaal = pdf_field("Totaal vakantiegeld", r_regions["Totaal vakantiegeld (EUR)"])
    f_r_negatief = pdf_field("Negatieve saldi", r_regions["Negatieve saldi"])
    file_reserveringen = pdf_file("Reserveringenoverzicht", r_pdf_id, r_filename, r_pages,
                                  [f_r_periode, f_r_totaal, f_r_negatief])
    rb = RuleBuilder(c5_id)
    n_periode = rb.field_input(f_r_periode, file_reserveringen)
    n_totaal = rb.field_input(f_r_totaal, file_reserveringen)
    n_negatief = rb.field_input(f_r_negatief, file_reserveringen)
    g_vg = rb.global_value(group_id, groep, gv["Totaal vakantiegeldreservering"])
    l_nul = rb.literal("0", "number")
    rb.comparison("Vakantiegeldreservering sluit aan", n_totaal, g_vg)
    rb.comparison("Geen negatieve reserveringssaldi", n_negatief, l_nul)
    rb.validation("Periode is ingevuld", n_periode, "not_empty")
    seed_controle(c5_id, "Reserveringencontrole", klant_id, naam,
                  "Sanne de Ruiter", [file_reserveringen], rb.result())

    # -- Serie + runs --
    series_id = seed_series("Maandafsluiting februari 2026", klant_id, naam, [
        (c1_id, "Loonstrokencontrole", "always"),
        (c2_id, "Loonjournaal maandcontrole", "if_passed"),
        (c3_id, "Medewerkersbestand aansluiting", "if_passed"),
        (c4_id, "Loonaangifte controle", "if_passed"),
        (c5_id, "Reserveringencontrole", "if_passed"),
    ])

    strook_files = {file_strook["id"]: [pid for pid, _ in strook_ids]}
    strook_names = dict(strook_ids)
    await run_controle(c1_id, RunControleRequest(files=strook_files, filenames=strook_names))
    await run_controle(c2_id, RunControleRequest(
        files={file_journaal["id"]: [j_pdf_id]}, filenames={j_pdf_id: j_filename}))
    await run_controle(c3_id, RunControleRequest(files={}))
    await run_controle(c4_id, RunControleRequest(
        files={file_aangifte["id"]: [a_pdf_id]}, filenames={a_pdf_id: a_filename}))
    await run_controle(c5_id, RunControleRequest(
        files={file_reserveringen["id"]: [r_pdf_id]}, filenames={r_pdf_id: r_filename}))

    from services.controle_series_store import get_controle_series
    series = get_controle_series(series_id)
    s1, s2, s3, s4, s5 = sorted(series.steps, key=lambda s: s.order)
    await run_series(series_id, RunSeriesRequest(
        files={s1.id: strook_files,
               s2.id: {file_journaal["id"]: [j_pdf_id]},
               s3.id: {},
               s4.id: {file_aangifte["id"]: [a_pdf_id]},
               s5.id: {file_reserveringen["id"]: [r_pdf_id]}},
        filenames={**strook_names, j_pdf_id: j_filename,
                   a_pdf_id: a_filename, r_pdf_id: r_filename}))

    print(f"✓ Flow: {naam} - 5 controles, 1 serie, 6 runs")
    return (c1_id, file_strook["id"], strook_files, strook_names,
            correctie_path, correctie_filename)


async def verify_correctie_strook(c1_id, slot_id, strook_files, strook_names,
                                  correctie_path, correctie_filename):
    """Run controle 1 with the correctie-strook included; expect exactly one
    uurloon failure on exactly that file. Leaves no trace in storage."""
    storage = get_storage()
    runs_before = set(storage.list_controle_run_ids())
    pdf_id = str(uuid.uuid4())
    with open(correctie_path, "rb") as f:
        storage.upload_pdf(pdf_id, f.read())
    meta = storage.load_metadata()
    meta[pdf_id] = {"filename": correctie_filename, "page_count": 1}
    storage.save_metadata(meta)
    try:
        responses = await run_controle(c1_id, RunControleRequest(
            files={slot_id: strook_files[slot_id] + [pdf_id]},
            filenames={**strook_names, pdf_id: correctie_filename}))
        failing = [(r, [rr for rr in r.template_rule_results if not rr.passed])
                   for r in responses]
        failing = [(r, bad) for r, bad in failing if bad]
        assert len(failing) == 1, f"verwacht 1 falende strook, kreeg {len(failing)}"
        resp, bad = failing[0]
        assert resp.source_filename == correctie_filename, resp.source_filename
        assert [rr.rule_name for rr in bad] == ["Uurloon voldoet aan CAO-minimum"], \
            [rr.rule_name for rr in bad]
        assert all(fr.status == "ok" for r in responses for fr in r.results), \
            "veldextractie faalde op een strook"
    finally:
        for rid in set(storage.list_controle_run_ids()) - runs_before:
            for suffix in (".json", "_details.json"):
                path = os.path.join(STORAGE_DIR, "controle_runs", f"{rid}{suffix}")
                if os.path.exists(path):
                    os.remove(path)
        storage.delete_pdf(pdf_id)
        meta = storage.load_metadata()
        meta.pop(pdf_id, None)
        storage.save_metadata(meta)
    print("✓ Correctie-strook: 1 strook faalt op precies de uurloon-regel")


# ════════════════════════════════════════════════════════════════════
# Verification + main
# ════════════════════════════════════════════════════════════════════

def verify_runs():
    """Print run results; fail loudly if any seeded rule did not pass."""
    storage = get_storage()
    problems = []
    print("\nRun-resultaten:")
    for rid in storage.list_controle_run_ids():
        run = json.loads(storage.get_controle_run(rid))
        line = (f"  [{run['status']:7s}] {run['klantName']} / {run['controleName']}: "
                f"velden {run['passedFields']}/{run['totalFields']}, "
                f"regels {run['rulesPassed']}/{run['rulesTotal']}")
        print(line)
        if run["status"] != "success":
            problems.append(run)
            details = storage.get_controle_run_details(rid)
            if details:
                for resp in json.loads(details):
                    for fr in resp["results"]:
                        if fr["status"] != "ok":
                            print(f"      veld '{fr['label']}': {fr['status']} (waarde: '{fr['value']}')")
                    for rr in resp["template_rule_results"]:
                        if not rr["passed"]:
                            print(f"      regel '{rr['rule_name']}': {rr['message']}")
    for rid in storage.list_controle_series_run_ids():
        run = json.loads(storage.get_controle_series_run(rid))
        steps = ", ".join(f"{s['controleName']}={s['status']}" for s in run["stepResults"])
        print(f"  [serie  ] {run['klantName']} / {run['seriesName']}: {run['status']} ({steps})")
        if run["status"] != "completed" or any(s["status"] != "passed" for s in run["stepResults"]):
            problems.append(run)
    if problems:
        sys.exit(f"\n✗ {len(problems)} run(s) niet volledig geslaagd, zie details hierboven.")
    print("\n✓ Alle runs geslaagd. Sample-bestanden staan in sample_files/ per klant.")


async def main():
    clear_all()
    if os.path.isdir(SAMPLE_DIR):
        shutil.rmtree(SAMPLE_DIR)
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    ctx = await seed_flow_groene_linde()
    await verify_correctie_strook(*ctx)
    verify_runs()


if __name__ == "__main__":
    asyncio.run(main())
