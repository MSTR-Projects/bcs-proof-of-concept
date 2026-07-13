"""Generate sample rapport-PDFs to upload in the Run Controle dialog.

Produces one PDF per rapport of the Polaris Maandcontrole (7) and the
Polaris Kwartaalcheck (3), styled as output of a fictional payroll system
("Polaris Salarisverwerking") for demo client Bakkerij de Gouden Korst.
Person numbers and names match frontend/src/data/demo-data.ts so extraction
results line up with the demo dataset.

Output: <repo-root>/sample_pdfs/
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_pdfs")
os.makedirs(OUT_DIR, exist_ok=True)

styles = getSampleStyleSheet()
title_style = ParagraphStyle("rpt-title", parent=styles["Title"], fontSize=16, spaceAfter=2)
meta_style = ParagraphStyle("rpt-meta", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#475569"))
cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8, leading=11)
footer_style = ParagraphStyle("footer", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#94a3b8"))

TABLE_STYLE = TableStyle([
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

WERKGEVER = "Bakkerij de Gouden Korst"
WERKGEVER_NR = "4021"
PERIODE = "2026-01"
RUN_DATUM = "03-02-2026"


def build_report(filename, rapport, kolommen, rijen, periode=PERIODE, note=None):
    path = os.path.join(OUT_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm)
    elements = [
        Paragraph("Polaris Salarisverwerking", meta_style),
        Paragraph(rapport, title_style),
        Paragraph(
            f"Werkgever: {WERKGEVER} ({WERKGEVER_NR}) &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"Periode: {periode} &nbsp;&nbsp;|&nbsp;&nbsp; Rundatum: {RUN_DATUM}",
            meta_style,
        ),
        Spacer(1, 8 * mm),
    ]
    data = [kolommen] + [
        [Paragraph(str(c), cell_style) for c in rij] for rij in rijen
    ]
    page_width = A4[0] - 36 * mm
    elements.append(Table(data, colWidths=col_widths(kolommen, page_width), style=TABLE_STYLE, repeatRows=1))
    if note:
        elements += [Spacer(1, 4 * mm), Paragraph(note, meta_style)]
    elements += [
        Spacer(1, 8 * mm),
        Paragraph(f"Aantal regels: {len(rijen)}  |  Gegenereerd door Polaris v8.2 (fictieve testdata)", footer_style),
    ]
    doc.build(elements)
    print(f"  {filename}")


def col_widths(kolommen, total):
    # Wide last column for omschrijving/opmerking-style text
    n = len(kolommen)
    if n <= 3:
        return [total / n] * n
    wide = total * 0.42
    rest = (total - wide) / (n - 1)
    return [rest] * (n - 1) + [wide]


# ── Polaris Maandcontrole (7 rapporten) ──

build_report(
    "sample_verwerkingssignalen.pdf", "Verwerkingssignalen",
    ["Fout", "Controle", "PersNr", "Naam", "Omschrijving"],
    [
        ["s", "P0003", "20401", "Bakker, J.P.", "Ingang functie voor begin dienstverband"],
        ["f", "P0012", "20415", "De Vries, M.A.", "Ontbrekend adres/woonplaats"],
        ["s", "P0003", "20418", "Yilmaz, A.", "Ingang functie voor begin dienstverband"],
    ],
    note="Fouttype: f = fataal, s = signaal.",
)

build_report(
    "sample_loonaangifte.pdf", "Loonaangifte signalen",
    ["Code", "PersNr", "Naam", "Melding"],
    [
        ["LA-014", "20415", "De Vries, M.A.", "BSN ontbreekt, aanlevering aan Belastingdienst geblokkeerd"],
    ],
)

build_report(
    "sample_twk.pdf", "TWK-mutaties",
    ["PersNr", "Naam", "Mutatie", "Oud", "Nieuw", "TWK-periode"],
    [
        ["20403", "Smit, L.J.", "Parttime%", "80%", "100%", "2025-12"],
        ["20419", "Van den Berg, P.H.", "Salaris", "3.200,00", "3.450,00", "2025-12"],
    ],
)

build_report(
    "sample_indienst.pdf", "In-dienst controle",
    ["PersNr", "Naam", "Datum in dienst", "Check", "Resultaat"],
    [
        ["20432", "Pietersen, A.", "01-01-2026", "Correspondentieadres", "Wijkt af van adrestype"],
        ["20432", "Pietersen, A.", "01-01-2026", "Rooster vs contract", "Rooster 20u, contract 38u"],
        ["20432", "Pietersen, A.", "01-01-2026", "Vakantiegeld reservering", "Ontbreekt"],
    ],
)

build_report(
    "sample_uitdienst.pdf", "Uit-dienst controle",
    ["PersNr", "Naam", "Datum uit dienst", "Reservering", "Saldo"],
    [
        ["20408", "Willems, K.D.", "31-01-2026", "Vakantiegeld", "1.247,30"],
        ["20408", "Willems, K.D.", "31-01-2026", "Vakantiedagen", "8,5 dgn"],
    ],
)

build_report(
    "sample_betalingen.pdf", "Betalingen",
    ["PersNr", "Naam", "Type", "Bedrag", "Rekening"],
    [
        ["20401", "Bakker, J.P.", "SEPA", "2.847,12", "NL91INGB0004567890"],
        ["20403", "Smit, L.J.", "SEPA", "3.102,55", "NL02RABO0123456789"],
        ["20427", "De Groot, S.", "Kasbetaling", "1.958,40", "-"],
        ["20415", "De Vries, M.A.", "SEPA", "2.211,08", "NL69ABNA0417164300"],
    ],
)

build_report(
    "sample_reserveringen.pdf", "Reserveringen",
    ["PersNr", "Naam", "Reservering", "Opbouw", "Opname", "Saldo"],
    [
        ["20401", "Bakker, J.P.", "Vakantiegeld", "227,77", "0,00", "1.593,42"],
        ["20403", "Smit, L.J.", "Vakantiegeld", "248,20", "0,00", "1.737,44"],
        ["20415", "De Vries, M.A.", "Vakantiegeld", "176,89", "0,00", "1.238,21"],
        ["20419", "Van den Berg, P.H.", "Vakantiegeld", "276,00", "0,00", "1.932,05"],
    ],
)

# ── Polaris Kwartaalcheck (3 rapporten) ──

build_report(
    "sample_kwartaaloverzicht.pdf", "Kwartaaloverzicht",
    ["Maand", "Medewerkers", "Bruto totaal", "Loonheffing", "Netto totaal"],
    [
        ["2025-10", "33", "128.410,00", "41.203,55", "82.114,20"],
        ["2025-11", "34", "131.220,00", "42.108,90", "83.902,75"],
        ["2025-12", "34", "156.884,00", "51.442,10", "98.317,60"],
    ],
    periode="2025-Q4",
    note="December inclusief eindejaarsuitkering.",
)

build_report(
    "sample_cumulatieven.pdf", "Cumulatieven",
    ["PersNr", "Naam", "Bruto cum.", "LH cum.", "Netto cum.", "SV-dagen"],
    [
        ["20401", "Bakker, J.P.", "38.412,00", "12.310,44", "24.588,31", "65"],
        ["20403", "Smit, L.J.", "41.850,00", "13.522,08", "26.601,17", "65"],
        ["20415", "De Vries, M.A.", "29.940,00", "9.211,73", "19.622,90", "63"],
        ["20419", "Van den Berg, P.H.", "37.260,00", "11.980,15", "23.917,42", "65"],
    ],
    periode="2025-Q4",
)

build_report(
    "sample_jaaropgave.pdf", "Jaaropgave-overzicht",
    ["PersNr", "Naam", "Loon LH", "Ingehouden LH", "Arbeidskorting", "Verstrekt"],
    [
        ["20401", "Bakker, J.P.", "38.412,00", "12.310,44", "4.319,00", "Ja"],
        ["20403", "Smit, L.J.", "41.850,00", "13.522,08", "4.128,00", "Ja"],
        ["20415", "De Vries, M.A.", "29.940,00", "9.211,73", "4.905,00", "Nee"],
        ["20419", "Van den Berg, P.H.", "37.260,00", "11.980,15", "4.402,00", "Ja"],
    ],
    periode="2025",
    note="Verstrekt = jaaropgave verzonden aan medewerker.",
)

print(f"\nKlaar. PDFs staan in {os.path.abspath(OUT_DIR)}")
