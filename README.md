# BCS - PDF Data Extractor

Deterministic PDF data extraction using template-based bounding boxes. No AI — pure algorithmic extraction with configurable field pipelines and validation rules.

Draw fields on a PDF, save as a template, then extract structured data from any PDF with the same layout. Supports two-file comparison mode for cross-document validation (e.g., receipt vs invoice).

## The Business Story

BCS supports salaris- and HR-service teams that check their clients' payroll every period. Today that work is manual: a controleur opens the payroll reports, scans them line by line against CAO agreements, contracts and budgets, and writes findings back to the client. It is repetitive, slow, and one tired pair of eyes away from a missed error.

The Controle assistent turns that routine into a repeatable product:

- **Set up once, run every period.** A controle captures what a check looks like: which reports to expect, which numbers matter, and which rules they must satisfy. From then on, running the monthly check is drag, drop, done — seconds instead of hours.
- **The same check, every time.** Because extraction and rules are deterministic (no AI, no judgment calls), two controleurs — or the same controleur in a busy December — get identical results. Quality no longer depends on who happens to run the check.
- **Agreements live in one place.** CAO figures, budgets and contract numbers are stored as globale waarden. When the CAO changes in January, you update one number and every check that uses it is instantly current — no hunting through individual controles.
- **Findings you can stand behind.** Every run is stored: which documents were checked, which values were found, which rules passed or failed, and when. When a client asks "did you check this?", the answer is one click away.
- **From check to process.** Reeksen chain controles into a period close: if the payroll journal doesn't reconcile, the downstream checks don't run. The month-end routine becomes a single button.

### What's in the box (features in plain terms)

| Feature | What it means for the business |
|---|---|
| **Klanten** | Work is organized per client, the way the team already thinks. Each client has its own checks, schedules and history. |
| **Controles** | Reusable check definitions: expected documents, the values to read from them, and the rules those values must meet. |
| **Regels** | The professional judgment of a controleur, written down once as visual building blocks — comparisons, totals, completeness checks — that anyone can read and audit. |
| **Globale waarden** | The single source of truth for CAO figures, budgets and contract data, with version history. |
| **Reeksen** | Checks chained into a workflow with conditions ("only continue if the previous step passed"), so a full period close runs as one action. |
| **Geschiedenis** | A permanent, clickable record of every run — the audit trail for internal quality control and client questions. |

### What the sample data represents

The seeded demo is one complete, realistic engagement: the month-end payroll close (maandafsluiting) of Hoveniersbedrijf De Groene Linde, a landscaping company with 20 employees. The files in `sample_files/` are the documents a payroll system would actually produce for that close: 20 individual loonstroken, a loonjournaal, an employee list, a loonaangifte and a reserveringenoverzicht, with numbers that genuinely reconcile. Filenames are numbered `01_` through `24_` in slot order, and the Run dialogs prefill the slots automatically based on those names, so a demo run is select-all, drag, done.

Done by hand, this close means opening every payslip and checking it against the CAO, then reconciling journaal, aangifte and reserveringen: roughly 20 x 12 minutes of payslip checking plus 45 + 20 + 20 minutes of reconciliation, about 5.5 hours, every month, for one client. The seeded serie runs the same checks in about two minutes of drag-and-drop.

There is one extra file, kept apart in `sample_files/correctie-strook/` so a select-all in the klant folder never includes it by accident: `Loonstrook_2026-02_50114_correctie.pdf`, a payslip with an hourly wage of EUR 12.80, below the CAO minimum of EUR 14.06. It is not part of the seeded history. During a demo you add it to the pile, re-run, and BCS flags exactly that payslip with "12.8 is not >= 14.06". That is the catch moment: a compliance error a tired human eye misses, found by the system in seconds.

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # macOS/Linux
# .venv\Scripts\activate     # Windows
pip install -e .
```

### Frontend

```bash
cd frontend
npm install
```

## Running

Start both the backend and frontend in separate terminals:

**Backend** (runs on http://localhost:8000):

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

**Frontend** (runs on http://localhost:5173):

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Demo Data

The repo ships with a seed script that resets the local storage and seeds one deep demo flow as a full chain: klant → global value group → sample files → controles (fields, rules, rule graph) → controle series → run history.

```bash
cd backend
source .venv/bin/activate
pip install reportlab    # only needed for the generator/seed scripts
python seed_demo_data.py
```

The script:

- **Clears** all controles, controle runs, series, series runs, klanten, global values, spreadsheets and uploaded PDFs (templates, test runs and translation rules are kept). Local storage only; it refuses to run against Azure.
- **Seeds** Hoveniersbedrijf De Groene Linde (20 medewerkers) with the serie "Maandafsluiting februari 2026": five controles (Loonstrokencontrole, Loonjournaal maandcontrole, Medewerkersbestand aansluiting, Loonaangifte controle, Reserveringencontrole), one global value group (CAO Hoveniersbedrijf 2026) and 24 numbered sample files plus the correctie-strook. Rules reference the seeded global values, spreadsheet totals reconcile with PDF totals, and PDF field regions are derived with pdfplumber so extraction works like a hand-drawn template.
- **Verifies** itself by executing real controle and series runs through the backend routers, plus a check that the correctie-loonstrook fails exactly the uurloon rule; it exits non-zero on any mismatch.

Generated sample files are copied to `sample_files/hoveniersbedrijf-de-groene-linde/` (the correctie-strook to `sample_files/correctie-strook/`) so they can be re-uploaded manually in the Run dialogs. `sample_pdfs/` contains additional standalone rapport-PDFs (verwerkingssignalen, loonaangifte, TWK, etc.) generated by `backend/generate_sample_controle_pdfs.py`.

## Demo Guide

A 15-20 minute walkthrough using the seeded data, written as click-by-click actions. Every step below was verified against the seeded state.

**Preparation (before the demo):**

1. Run the seed script (see Demo Data above).
2. Start the backend (`uvicorn main:app --reload`) and frontend (`npm run dev`).
3. Open http://localhost:5173 and log in with `admin@bcs-hr.nl` / `admin123`.
4. Have the `sample_files/hoveniersbedrijf-de-groene-linde/` folder (and `sample_files/correctie-strook/` for the catch moment) ready in a Finder/Explorer window for drag-and-drop.

The storyline: the monthly payroll close of De Groene Linde takes a controleur about 5.5 hours by hand (20 loonstroken x 12 min nakijken, plus 45 min journaal-aansluiting, 20 min loonaangifte, 20 min reserveringen). With BCS the same close is one serie run of about 2 minutes, and the checks are identical every month. Lead with that number; everything in the demo backs it up.

### 1. Dashboard and Klant (2 min)

1. You land on the **Dashboard**: point at the stat cards (controles uitgevoerd, geslaagd, bevindingen) and the "Recente controles" table. The top rows show the Loonstrokencontrole with **100/100 velden** and **80/80 regels**: that is 20 payslips checked in one run.
2. In the sidebar, click **Klanten** and select **Hoveniersbedrijf De Groene Linde**: 20 medewerkers, five controles, the serie "Maandafsluiting februari 2026" and the controlegeschiedenis, all in one client view.

Talking point: work is organized per klant, the way the team already thinks. Everything you are about to see hangs under this one client.

### 2. Globale waarden (1 min)

1. In the sidebar under Ontwikkelen, click **Globale waarden**: one group, **CAO Hoveniersbedrijf 2026**, with 6 values (v1).
2. Click the row: Loonheffingsnummer, Aantal medewerkers, CAO minimumuurloon (14.06), Vakantiegeldpercentage (8), Bruto loonsom februari, Totaal vakantiegeldreservering. Click **Annuleren** to close.

Talking point: CAO numbers and budgets live in one place. When the CAO changes in January, you update one number and every controle is instantly current.

### 3. Anatomy of a controle (3 min)

1. In the sidebar, click **Alle controles**: five controles, together one maandafsluiting.
2. Click **Loonstrokencontrole**, point at the stats (1 bestand, 5 velden, 4 regels), then click **Bewerken** (top right).
3. On the Bestanden tab, click **Bewerken** on the Loonstrook file card: a loonstrook opens with five field regions drawn on it (Periode, Loonheffingsnummer, Uurloon, Bruto maandsalaris, Vakantiegeldpercentage).
4. Click **Test uitvoeren** (bottom left): the fields extract live and turn green. This also unlocks the Regels tab.
5. Click **← Bestanden**, then the **Regels** tab: the rule graph connects the loonstrook fields and globale waarden to comparison nodes, including "Uurloon voldoet aan CAO-minimum" (>=) and "Vakantiegeldpercentage conform CAO".
6. Click **Preview uitvoeren** (bottom right): 4/4 validaties geslaagd. Navigate back via **Alle controles** (breadcrumb) *without* clicking Publiceren.

Talking point: no code, no AI. Deterministic extraction from drawn regions plus an auditable rule graph. Define it once, run it every month.

### 4. The serie run: 5.5 hours in 2 minutes (5 min)

This is the core of the demo.

1. In the sidebar, click **Reeksen**, then the **Maandafsluiting februari 2026** row.
2. Point at the five steps: step 1 *Altijd*, steps 2-5 *Als vorige geslaagd*. The month-end close as one workflow.
3. Click **Uitvoeren** (top right).
4. Select **all 24 files** in `sample_files/hoveniersbedrijf-de-groene-linde/` and drag them into the upload zone in one go.
5. The slots prefill automatically based on the filenames: 20 loonstroken (01-20) on the **Loonstrook** slot, the journaal (21), xlsx (22), aangifte (23) and reserveringen (24) on their own slots. Assigned files show dimmed with a checkmark in the pool; anything unassigned can still be dragged by hand.
6. Click **Serie uitvoeren**. Within seconds: status **Voltooid**, five steps **Geslaagd**.
7. Click step 1 (Loonstrokencontrole): **100 velden OK, 80/80 regels geslaagd**, with all 20 loonstroken listed on the left, each 5/5, and green markers on the document. This is the 4 hours of payslip checking, done in seconds.
8. Click **Terug naar serie**: you land back on the stored results (each run now has a permanent URL, so this result stays reachable after refresh or later).

Talking point while it runs: "Wat jullie net zagen is de volledige maandafsluiting van een klant. Handmatig is dit ruim vijf uur werk. Dit was twee minuten, en volgende maand weer twee minuten."

### 5. The catch moment: BCS finds what a human misses (3 min)

1. On the serie results page, click **Opnieuw uitvoeren**.
2. Upload the same 24 files **plus** `sample_files/correctie-strook/Loonstrook_2026-02_50114_correctie.pdf` (25 total); the correctie-strook prefills onto the Loonstrook slot along with the other 20.
3. Click **Serie uitvoeren**. Now the serie stops: status **Gestopt**, step 1 **Gefaald**, follow-up steps skipped.
4. Click step 1: the header shows **83/84 regels geslaagd**. In the Bestanden list, click `Loonstrook_2026-02_50114_correctie.pdf`, open the **Overzicht** tab and point at the failing rule: "Uurloon voldoet aan CAO-minimum" with the message **12.8 is not >= 14.06**.

Talking point: one payslip out of 21 pays EUR 12.80 per hour, below the CAO minimum. By hand, that is the error you miss at 16:30 on a Friday. BCS finds it every time, points at the exact document and the exact rule, and stops the rest of the close until it is fixed.

### 6. Geschiedenis and audit (1 min)

1. In the sidebar, click **Geschiedenis**: every run listed with veld- and regelscores; the failed 83/84 run now sits at the top.
2. Click any run row: the stored result opens exactly as it was at run time. Serie runs are equally clickable from the klant detail panel and the serie's Uitvoergeschiedenis.

Talking point: every run is persisted. When a client asks "hebben jullie dit gecontroleerd?", the answer is one click, with document, values and rules as they were on that date.

### 7. Build one from scratch (3 min, optional)

1. In the sidebar, click **Controle maken**.
2. Upload a PDF from `sample_pdfs/` (e.g. `sample_verwerkingssignalen.pdf`) and give the file a label.
3. Open the file, use the draw tool to drag a box around a value on the document, and name the field.
4. Click **Test uitvoeren** to extract it, go to the **Regels** tab, add a validation node (Not Empty) and connect the field to it.
5. Click **Publiceren**, then run it via **Uitvoeren** with the same PDF.

Talking point: from blank to running controle in a few minutes; that is the whole product loop.

**Reset after the demo:** rerun the seed script to remove the failed run and restore the pristine state.

## How It Works

1. **Upload PDFs** — click Upload in the header to add PDF files
2. **Create a template** — draw bounding boxes on the PDF to define fields:
   - **Static fields** — fixed position extraction (blue boxes)
   - **Dynamic fields** — anchor text + value offset (amber anchor + blue value)
3. **Add validation rules** — per-field rules like data type checks, range limits, regex patterns, cross-field comparisons
4. **Test** — run the template against any PDF with the same layout to extract and validate data
5. **Comparison mode** — work with two PDFs side by side and create cross-document field comparisons

## Project Structure

```
bcs/
├── backend/                     # Python FastAPI
│   ├── main.py                  # App entry point, CORS config
│   ├── routers/
│   │   ├── pdfs.py              # PDF upload, serve, list, delete
│   │   ├── templates.py         # Template CRUD
│   │   └── extract.py           # Extraction + testing endpoints
│   ├── services/
│   │   ├── pdf_service.py       # pdfplumber text extraction, anchor search
│   │   ├── extraction_service.py # Rule validation, two-pass extraction
│   │   ├── chain_engine.py      # Configurable extraction pipeline engine
│   │   └── template_store.py    # JSON file storage
│   ├── models/schemas.py        # Pydantic models
│   ├── seed_demo_data.py        # Reset + seed the maandafsluiting demo flow
│   ├── generate_sample_controle_pdfs.py # Standalone rapport-PDF generator
│   └── storage/                 # Runtime data (gitignored)
│       ├── uploads/             # Uploaded PDFs
│       └── templates/           # Saved templates
│
├── sample_files/                # Seeded demo files per klant (PDF + xlsx)
├── sample_pdfs/                 # Standalone sample rapport-PDFs
│
└── frontend/                    # React + TypeScript + Tailwind + Vite
    └── src/
        ├── App.tsx              # Main layout
        ├── components/          # UI components
        ├── store/appStore.ts    # Zustand state management
        ├── hooks/               # Custom React hooks
        ├── api/client.ts        # Backend API client
        ├── types/index.ts       # TypeScript type definitions
        └── utils/coords.ts      # Coordinate conversion utilities
```

## API

The backend runs a REST API on port 8000. Key endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/pdfs/upload` | Upload a PDF |
| GET | `/pdfs` | List uploaded PDFs |
| GET | `/pdfs/{id}` | Serve a PDF file |
| DELETE | `/pdfs/{id}` | Delete a PDF |
| POST | `/templates` | Create a template |
| GET | `/templates` | List templates |
| PUT | `/templates/{id}` | Update a template |
| DELETE | `/templates/{id}` | Delete a template |
| POST | `/extract` | Extract using a saved template |
| POST | `/test` | Test with inline fields |

API docs available at http://localhost:8000/docs when the backend is running.
