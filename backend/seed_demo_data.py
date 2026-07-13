"""Wipe all controle-related data and seed three complete demo flows.

Each flow is a full chain: klant -> global value group -> sample files
(PDF + spreadsheet) -> controles with fields, rules and rule graph ->
controle series -> run history (real extraction runs, so every seeded
rule is verified to pass).

Flows:
  1. Bakkerij de Gouden Korst      - maandcontrole loonjournaal + medewerkersbestand
  2. Installatiebedrijf Jansen & Zn. - implementatiecheck + pensioenpremie aansluiting
  3. Transportbedrijf Van Dijk     - kwartaalcontrole cumulatieven + uit-dienst eindafrekening

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
            "label": "==", "nodeType": "comparison",
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
# Flow 1 — Bakkerij de Gouden Korst
# ════════════════════════════════════════════════════════════════════

async def seed_flow_bakkerij():
    naam = "Bakkerij de Gouden Korst"
    slug = "bakkerij-de-gouden-korst"
    aantal = 34
    klant_id = seed_klant(naam, aantal)

    # -- Medewerkersbestand (spreadsheet) --
    functies = ["Bakker", "Broodbakker", "Banketbakker", "Verkoopmedewerker", "Bezorger",
                "Teamleider winkel", "Administratief medewerker"]
    medewerkers = []
    for i in range(aantal):
        salaris = rng.randrange(2300, 4400, 50)
        medewerkers.append([20401 + i, make_naam(), rng.choice(functies),
                            rng.choice([24, 28, 32, 36, 38, 40]), salaris])
    totaal_bruto = sum(m[4] for m in medewerkers)

    # -- Global values --
    group_id, gv = seed_global_group("CAO Bakkersbedrijf 2026", [
        ("Loonheffingsnummer", "text", "8123.45.678.L01"),
        ("Aantal medewerkers", "number", aantal),
        ("Bruto loonsom januari", "number", totaal_bruto),
        ("Vakantiegeld percentage", "number", 8),
        ("Minimumuurloon CAO", "number", "14.06"),
    ])

    # -- Loonjournaal PDF --
    lh = round(totaal_bruto * 0.34)
    filename = "Loonjournaal_2026-01_Bakkerij_de_Gouden_Korst.pdf"
    pdf_id, pages, regions = make_report(
        filename, slug, "Loonjournaal januari 2026",
        meta_pairs=[
            ("Werkgever", f"{naam} (4021)"),
            ("Periode", "2026-01"),
            ("Loonheffingsnummer", "8123.45.678.L01"),
            ("Aantal medewerkers", aantal),
            ("Totaal bruto (EUR)", totaal_bruto),
        ],
        table_title="Journaalposten",
        headers=["Grootboek", "Omschrijving", "Debet (EUR)", "Credit (EUR)"],
        rows=[
            ["4001", "Bruto lonen", f"{totaal_bruto}", ""],
            ["4002", f"Vakantiegeldreservering 8%", f"{round(totaal_bruto * 0.08)}", ""],
            ["4011", "Pensioenpremie werkgever", f"{round(totaal_bruto * 0.079)}", ""],
            ["1601", "Af te dragen loonheffing", "", f"{lh}"],
            ["1602", "Netto lonen te betalen", "", f"{totaal_bruto - lh}"],
        ],
        note="Verloond volgens CAO Bakkersbedrijf, loontijdvak maand.",
    )

    # -- Controle A: Loonjournaal maandcontrole (PDF eerst, regels op PDF-velden) --
    controle_a_id = str(uuid.uuid4())
    f_periode = pdf_field("Periode", regions["Periode"])
    f_lh_nr = pdf_field("Loonheffingsnummer", regions["Loonheffingsnummer"])
    f_aantal = pdf_field("Aantal medewerkers", regions["Aantal medewerkers"])
    f_bruto = pdf_field("Totaal bruto", regions["Totaal bruto (EUR)"])
    file_journaal = pdf_file("Loonjournaal", pdf_id, filename, pages,
                             [f_periode, f_lh_nr, f_aantal, f_bruto])

    rb = RuleBuilder(controle_a_id)
    n_periode = rb.field_input(f_periode, file_journaal)
    n_lh = rb.field_input(f_lh_nr, file_journaal)
    n_aantal = rb.field_input(f_aantal, file_journaal)
    n_bruto = rb.field_input(f_bruto, file_journaal)
    g_lh = rb.global_value(group_id, "CAO Bakkersbedrijf 2026", gv["Loonheffingsnummer"])
    g_aantal = rb.global_value(group_id, "CAO Bakkersbedrijf 2026", gv["Aantal medewerkers"])
    g_loonsom = rb.global_value(group_id, "CAO Bakkersbedrijf 2026", gv["Bruto loonsom januari"])
    rb.comparison("LH-nummer komt overeen met CAO-dossier", n_lh, g_lh)
    rb.comparison("Headcount klopt met contract", n_aantal, g_aantal)
    rb.comparison("Bruto loonsom binnen begroting", n_bruto, g_loonsom, "less_or_equal")
    rb.validation("Periode is ingevuld", n_periode, "not_empty")

    seed_controle(controle_a_id, "Loonjournaal maandcontrole", klant_id, naam,
                  "Nikki van der Heijden", [file_journaal], rb.result())

    # -- Controle B: Medewerkersbestand aansluiting (spreadsheet eerst) --
    ss_filename = "Medewerkers_2026-01_Bakkerij_de_Gouden_Korst.xlsx"
    ss_id, sheet_data = register_spreadsheet(
        ["Persnr", "Naam", "Functie", "Uren per week", "Bruto maandsalaris"],
        medewerkers, ss_filename, slug)

    controle_b_id = str(uuid.uuid4())
    f_eerste_pers = cell_field("Eerste personeelsnummer", 0, 0)
    file_medewerkers = spreadsheet_file("Medewerkersbestand", ss_id, ss_filename,
                                        sheet_data, [f_eerste_pers])

    rb = RuleBuilder(controle_b_id)
    c_bruto = rb.ss_column(file_medewerkers, 4)
    c_persnr = rb.ss_column(file_medewerkers, 0)
    n_eerste = rb.field_input(f_eerste_pers, file_medewerkers)
    g_loonsom = rb.global_value(group_id, "CAO Bakkersbedrijf 2026", gv["Bruto loonsom januari"])
    g_aantal = rb.global_value(group_id, "CAO Bakkersbedrijf 2026", gv["Aantal medewerkers"])
    agg_som = rb.aggregate(c_bruto, "sum", "Som bruto medewerkerslijst")
    agg_count = rb.aggregate(c_persnr, "count", "Aantal medewerkers in bestand")
    rb.comparison("Loonsom sluit aan op begroting", agg_som, g_loonsom)
    rb.comparison("Headcount komt overeen met CAO-dossier", agg_count, g_aantal)
    rb.validation("Medewerkersbestand is gevuld", n_eerste, "not_empty")

    seed_controle(controle_b_id, "Medewerkersbestand aansluiting", klant_id, naam,
                  "Nikki van der Heijden", [file_medewerkers], rb.result())

    # -- Serie + runs --
    series_id = seed_series("Maandafsluiting januari 2026", klant_id, naam, [
        (controle_a_id, "Loonjournaal maandcontrole", "always"),
        (controle_b_id, "Medewerkersbestand aansluiting", "if_passed"),
    ])

    await run_controle(controle_a_id, RunControleRequest(
        files={file_journaal["id"]: [pdf_id]}, filenames={pdf_id: filename}))
    await run_controle(controle_b_id, RunControleRequest(files={}))

    from services.controle_series_store import get_controle_series
    series = get_controle_series(series_id)
    step_a, step_b = sorted(series.steps, key=lambda s: s.order)
    await run_series(series_id, RunSeriesRequest(
        files={step_a.id: {file_journaal["id"]: [pdf_id]}, step_b.id: {}},
        filenames={pdf_id: filename}))

    print(f"✓ Flow 1: {naam} - 2 controles, 1 serie, 3 runs")


# ════════════════════════════════════════════════════════════════════
# Flow 2 — Installatiebedrijf Jansen & Zn.
# ════════════════════════════════════════════════════════════════════

async def seed_flow_jansen():
    naam = "Installatiebedrijf Jansen & Zn."
    slug = "installatiebedrijf-jansen-en-zn"
    aantal = 87
    klant_id = seed_klant(naam, aantal)

    # -- Pensioengrondslagen (spreadsheet) --
    franchise = 17545
    pensioen_rows = []
    for i in range(aantal):
        jaarloon = rng.randrange(33000, 62000, 100)
        grondslag = max(0, jaarloon - franchise)
        pensioen_rows.append([30001 + i, make_naam(), grondslag,
                              round(grondslag * 0.079), round(grondslag * 0.045)])
    totaal_premie_wg = sum(r[3] for r in pensioen_rows)

    # -- Global values --
    group_id, gv = seed_global_group("CAO Metaal & Techniek 2026", [
        ("Loonheffingsnummer", "text", "8234.56.789.L01"),
        ("Pensioenfranchise", "number", f"{franchise}.00"),
        ("Werkgeversbijdrage pensioen", "number", "7.9"),
        ("Pensioenpremie werkgever 2026", "number", totaal_premie_wg),
        ("Aantal medewerkers", "number", aantal),
    ])

    # -- Systeeminrichting PDF --
    filename = "Systeeminrichting_Polaris_Jansen_en_Zn.pdf"
    pdf_id, pages, regions = make_report(
        filename, slug, "Systeeminrichting nieuwe klant",
        meta_pairs=[
            ("Bedrijfsnaam", naam),
            ("Loonheffingsnummer", "8234.56.789.L01"),
            ("CAO", "Metaal en Techniek"),
            ("Loontijdvak", "Maand"),
            ("Pensioenfonds", "PME"),
            ("Franchise (EUR)", f"{franchise}.00"),
            ("Werkgeversbijdrage (%)", "7.9"),
        ],
        table_title="Ingerichte looncomponenten",
        headers=["Code", "Component", "Grondslag", "Status"],
        rows=[
            ["100", "Bruto maandsalaris", "Contract", "Actief"],
            ["210", "Overwerktoeslag 125%", "Uurloon", "Actief"],
            ["220", "Overwerktoeslag 150%", "Uurloon", "Actief"],
            ["310", "Vakantiegeld 8%", "Bruto loon", "Actief"],
            ["410", "Pensioenpremie PME", "Grondslag - franchise", "Actief"],
            ["420", "WIA-bodemverzekering", "SV-loon", "Actief"],
            ["510", "Reiskostenvergoeding", "Woon-werk km", "Actief"],
        ],
        note="Inrichting conform implementatieplan versie 2.1, akkoord projectleider.",
    )

    # -- Controle A: Implementatiecheck --
    controle_a_id = str(uuid.uuid4())
    f_bedrijf = pdf_field("Bedrijfsnaam", regions["Bedrijfsnaam"])
    f_lh = pdf_field("Loonheffingsnummer", regions["Loonheffingsnummer"])
    f_cao = pdf_field("CAO", regions["CAO"])
    f_tijdvak = pdf_field("Loontijdvak", regions["Loontijdvak"])
    f_fonds = pdf_field("Pensioenfonds", regions["Pensioenfonds"])
    f_franchise = pdf_field("Franchise", regions["Franchise (EUR)"])
    file_inrichting = pdf_file("Systeeminrichting", pdf_id, filename, pages,
                               [f_bedrijf, f_lh, f_cao, f_tijdvak, f_fonds, f_franchise])

    rb = RuleBuilder(controle_a_id)
    rb.field_input(f_bedrijf, file_inrichting)
    n_lh = rb.field_input(f_lh, file_inrichting)
    n_cao = rb.field_input(f_cao, file_inrichting)
    n_tijdvak = rb.field_input(f_tijdvak, file_inrichting)
    n_fonds = rb.field_input(f_fonds, file_inrichting)
    n_franchise = rb.field_input(f_franchise, file_inrichting)
    g_lh = rb.global_value(group_id, "CAO Metaal & Techniek 2026", gv["Loonheffingsnummer"])
    g_franchise = rb.global_value(group_id, "CAO Metaal & Techniek 2026", gv["Pensioenfranchise"])
    l_maand = rb.literal("Maand")
    rb.comparison("LH-nummer komt overeen met CAO-dossier", n_lh, g_lh)
    rb.comparison("Franchise conform CAO", n_franchise, g_franchise)
    rb.comparison("Loontijdvak is maand", n_tijdvak, l_maand)
    rb.validation("CAO is vastgelegd", n_cao, "not_empty")
    rb.validation("Pensioenfonds is gekoppeld", n_fonds, "not_empty")

    seed_controle(controle_a_id, "Implementatiecheck systeeminrichting", klant_id, naam,
                  "Wouter Bakker", [file_inrichting], rb.result())

    # -- Controle B: Pensioenpremie aansluiting --
    ss_filename = "Pensioengrondslagen_2026_Jansen_en_Zn.xlsx"
    ss_id, sheet_data = register_spreadsheet(
        ["Persnr", "Naam", "Pensioengrondslag", "Premie werkgever", "Premie werknemer"],
        pensioen_rows, ss_filename, slug)

    controle_b_id = str(uuid.uuid4())
    f_eerste = cell_field("Eerste personeelsnummer", 0, 0)
    file_pensioen = spreadsheet_file("Pensioengrondslagen", ss_id, ss_filename,
                                     sheet_data, [f_eerste])

    rb = RuleBuilder(controle_b_id)
    c_premie = rb.ss_column(file_pensioen, 3)
    c_persnr = rb.ss_column(file_pensioen, 0)
    n_eerste = rb.field_input(f_eerste, file_pensioen)
    g_premie = rb.global_value(group_id, "CAO Metaal & Techniek 2026", gv["Pensioenpremie werkgever 2026"])
    g_aantal = rb.global_value(group_id, "CAO Metaal & Techniek 2026", gv["Aantal medewerkers"])
    agg_premie = rb.aggregate(c_premie, "sum", "Som premie werkgever")
    agg_count = rb.aggregate(c_persnr, "count", "Aantal deelnemers")
    rb.comparison("Premie werkgever sluit aan op budget", agg_premie, g_premie)
    rb.comparison("Alle medewerkers nemen deel", agg_count, g_aantal)
    rb.validation("Grondslagenbestand is gevuld", n_eerste, "not_empty")

    seed_controle(controle_b_id, "Pensioenpremie aansluiting", klant_id, naam,
                  "Wouter Bakker", [file_pensioen], rb.result())

    # -- Serie + runs --
    series_id = seed_series("Onboarding Jansen & Zn.", klant_id, naam, [
        (controle_a_id, "Implementatiecheck systeeminrichting", "always"),
        (controle_b_id, "Pensioenpremie aansluiting", "if_passed"),
    ])

    await run_controle(controle_a_id, RunControleRequest(
        files={file_inrichting["id"]: [pdf_id]}, filenames={pdf_id: filename}))
    await run_controle(controle_b_id, RunControleRequest(files={}))

    from services.controle_series_store import get_controle_series
    series = get_controle_series(series_id)
    step_a, step_b = sorted(series.steps, key=lambda s: s.order)
    await run_series(series_id, RunSeriesRequest(
        files={step_a.id: {file_inrichting["id"]: [pdf_id]}, step_b.id: {}},
        filenames={pdf_id: filename}))

    print(f"✓ Flow 2: {naam} - 2 controles, 1 serie, 3 runs")


# ════════════════════════════════════════════════════════════════════
# Flow 3 — Transportbedrijf Van Dijk
# ════════════════════════════════════════════════════════════════════

async def seed_flow_van_dijk():
    naam = "Transportbedrijf Van Dijk"
    slug = "transportbedrijf-van-dijk"
    aantal = 156
    klant_id = seed_klant(naam, aantal)

    # -- Cumulatieven Q4 (spreadsheet) --
    cum_rows = []
    for i in range(aantal):
        maandloon = rng.randrange(2800, 5200, 25)
        bruto_cum = maandloon * 3
        cum_rows.append([40001 + i, make_naam(), bruto_cum,
                         round(bruto_cum * 0.34), rng.choice([63, 64, 65])])
    totaal_cum = sum(r[2] for r in cum_rows)

    # -- Global values --
    group_id, gv = seed_global_group("CAO Beroepsgoederenvervoer 2026", [
        ("Loonheffingsnummer", "text", "8345.67.890.L02"),
        ("Aantal medewerkers", "number", aantal),
        ("Bruto loonsom Q4 2025", "number", totaal_cum),
        ("Reiskostenvergoeding per km", "number", "0.23"),
        ("Max overuren per maand", "number", 20),
    ])

    # -- Kwartaaloverzicht PDF (tweede bestand in controle A) --
    kw_filename = "Kwartaaloverzicht_Q4-2025_Transportbedrijf_Van_Dijk.pdf"
    kw_pdf_id, kw_pages, kw_regions = make_report(
        kw_filename, slug, "Kwartaaloverzicht Q4 2025",
        meta_pairs=[
            ("Werkgever", f"{naam} (4058)"),
            ("Periode", "2025-Q4"),
            ("Aantal medewerkers", aantal),
            ("Totaal bruto (EUR)", totaal_cum),
        ],
        table_title="Loonsom per maand",
        headers=["Maand", "Medewerkers", "Bruto (EUR)", "Loonheffing (EUR)"],
        rows=[
            ["2025-10", str(aantal), f"{totaal_cum // 3}", f"{round(totaal_cum * 0.34) // 3}"],
            ["2025-11", str(aantal), f"{totaal_cum // 3}", f"{round(totaal_cum * 0.34) // 3}"],
            ["2025-12", str(aantal), f"{totaal_cum - 2 * (totaal_cum // 3)}", f"{round(totaal_cum * 0.34) - 2 * (round(totaal_cum * 0.34) // 3)}"],
        ],
        note="Inclusief chauffeurstoeslagen en overuren conform CAO Beroepsgoederenvervoer.",
    )

    # -- Controle A: Kwartaalcontrole cumulatieven (spreadsheet eerst) --
    ss_filename = "Cumulatieven_Q4-2025_Transportbedrijf_Van_Dijk.xlsx"
    ss_id, sheet_data = register_spreadsheet(
        ["Persnr", "Naam", "Bruto cumulatief", "Loonheffing cumulatief", "SV-dagen"],
        cum_rows, ss_filename, slug)

    controle_a_id = str(uuid.uuid4())
    f_eerste = cell_field("Eerste personeelsnummer", 0, 0)
    file_cum = spreadsheet_file("Cumulatieven", ss_id, ss_filename, sheet_data, [f_eerste])

    f_kw_periode = pdf_field("Periode", kw_regions["Periode"])
    f_kw_aantal = pdf_field("Aantal medewerkers", kw_regions["Aantal medewerkers"])
    f_kw_bruto = pdf_field("Totaal bruto", kw_regions["Totaal bruto (EUR)"])
    file_kwartaal = pdf_file("Kwartaaloverzicht", kw_pdf_id, kw_filename, kw_pages,
                             [f_kw_periode, f_kw_aantal, f_kw_bruto])

    rb = RuleBuilder(controle_a_id)
    c_bruto = rb.ss_column(file_cum, 2)
    c_persnr = rb.ss_column(file_cum, 0)
    n_eerste = rb.field_input(f_eerste, file_cum)
    g_loonsom = rb.global_value(group_id, "CAO Beroepsgoederenvervoer 2026", gv["Bruto loonsom Q4 2025"])
    g_aantal = rb.global_value(group_id, "CAO Beroepsgoederenvervoer 2026", gv["Aantal medewerkers"])
    agg_som = rb.aggregate(c_bruto, "sum", "Som bruto cumulatieven")
    agg_count = rb.aggregate(c_persnr, "count", "Aantal medewerkers in cumulatieven")
    rb.comparison("Cumulatieven sluiten aan op kwartaaloverzicht", agg_som, g_loonsom)
    rb.comparison("Headcount klopt met contract", agg_count, g_aantal)
    rb.validation("Cumulatievenbestand is gevuld", n_eerste, "not_empty")

    seed_controle(controle_a_id, "Kwartaalcontrole cumulatieven Q4", klant_id, naam,
                  "Esther Pot", [file_cum, file_kwartaal], rb.result())

    # -- Uit-dienst PDF --
    ud_filename = "Uitdienstoverzicht_2025-12_Transportbedrijf_Van_Dijk.pdf"
    uitdienst = [[str(40008 + i * 37), make_naam(), "31-12-2025",
                  rng.choice(["Vakantiegeld", "Vakantiedagen", "Tijd-voor-tijd"]), "0.00"]
                 for i in range(3)]
    ud_pdf_id, ud_pages, ud_regions = make_report(
        ud_filename, slug, "Uit-dienst eindafrekening december 2025",
        meta_pairs=[
            ("Werkgever", f"{naam} (4058)"),
            ("Periode", "2025-12"),
            ("Aantal uit dienst", "3"),
            ("Openstaand saldo (EUR)", "0.00"),
        ],
        table_title="Eindafrekeningen",
        headers=["Persnr", "Naam", "Uit dienst", "Reservering", "Restsaldo (EUR)"],
        rows=uitdienst,
        note="Alle reserveringen zijn uitbetaald in de laatste verloning.",
    )

    # -- Controle B: Uit-dienst eindafrekening --
    controle_b_id = str(uuid.uuid4())
    f_ud_periode = pdf_field("Periode", ud_regions["Periode"])
    f_ud_aantal = pdf_field("Aantal uit dienst", ud_regions["Aantal uit dienst"])
    f_ud_saldo = pdf_field("Openstaand saldo", ud_regions["Openstaand saldo (EUR)"])
    file_uitdienst = pdf_file("Uitdienstoverzicht", ud_pdf_id, ud_filename, ud_pages,
                              [f_ud_periode, f_ud_aantal, f_ud_saldo])

    rb = RuleBuilder(controle_b_id)
    n_periode = rb.field_input(f_ud_periode, file_uitdienst)
    n_aantal = rb.field_input(f_ud_aantal, file_uitdienst)
    n_saldo = rb.field_input(f_ud_saldo, file_uitdienst)
    l_nul = rb.literal("0.00", "number")
    rb.comparison("Geen openstaande saldi na uitdiensttreding", n_saldo, l_nul)
    rb.validation("Uitstroom is geregistreerd", n_aantal, "not_empty")
    rb.validation("Periode is ingevuld", n_periode, "not_empty")

    seed_controle(controle_b_id, "Uit-dienst eindafrekening", klant_id, naam,
                  "Esther Pot", [file_uitdienst], rb.result())

    # -- Serie + runs --
    series_id = seed_series("Kwartaalafsluiting Q4 2025", klant_id, naam, [
        (controle_a_id, "Kwartaalcontrole cumulatieven Q4", "always"),
        (controle_b_id, "Uit-dienst eindafrekening", "if_passed"),
    ])

    await run_controle(controle_a_id, RunControleRequest(
        files={file_kwartaal["id"]: [kw_pdf_id]}, filenames={kw_pdf_id: kw_filename}))
    await run_controle(controle_b_id, RunControleRequest(
        files={file_uitdienst["id"]: [ud_pdf_id]}, filenames={ud_pdf_id: ud_filename}))

    from services.controle_series_store import get_controle_series
    series = get_controle_series(series_id)
    step_a, step_b = sorted(series.steps, key=lambda s: s.order)
    await run_series(series_id, RunSeriesRequest(
        files={step_a.id: {file_kwartaal["id"]: [kw_pdf_id]},
               step_b.id: {file_uitdienst["id"]: [ud_pdf_id]}},
        filenames={kw_pdf_id: kw_filename, ud_pdf_id: ud_filename}))

    print(f"✓ Flow 3: {naam} - 2 controles, 1 serie, 3 runs")


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
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    await seed_flow_bakkerij()
    await seed_flow_jansen()
    await seed_flow_van_dijk()
    verify_runs()


if __name__ == "__main__":
    asyncio.run(main())
