# Demo Maandafsluiting Seed + Series-Run URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three seeded demo flows with one deep "Maandafsluiting februari 2026" flow (20 loonstroken + correctie-strook, 5 controles, 1 serie), and give stored series runs a permanent URL so "Terug naar serie" returns to results instead of the upload form.

**Architecture:** Part 1 is frontend-only: a new route `/controle-series/:id/run/:runId` renders the existing RunSeries page in results mode by fetching the stored run. Part 2 rewrites `backend/seed_demo_data.py`, keeping all existing helpers (build_pdf, labeled_value_region, register_pdf, register_spreadsheet, RuleBuilder, seed_* helpers, verify_runs) and replacing the three flow functions with one. Part 3 updates the README business story and demo guide.

**Tech Stack:** React + react-router + TypeScript (frontend), Python/FastAPI + reportlab + pdfplumber + openpyxl (seeder).

**Spec:** `docs/superpowers/specs/2026-07-14-demo-maandafsluiting-design.md`

## Global Constraints

- All demo copy is Dutch, je/jouw-vorm, no em dashes.
- Rules are evaluated only for the FIRST file slot of a controle (`backend/routers/controles.py:245`); never write a rule that mixes PDF fields and spreadsheet columns.
- All money amounts that rules compare must be exact: integer euros for salaries/loonsom, integer cents formatted `f"{cents/100:.2f}"` for vakantiegeld. No float sums in rule-compared values.
- Seeder supports local storage only (existing guard stays).
- No frontend test runner exists; frontend verification is `npm run build`, `npm run lint`, and driving the app.

---

### Task 1: Series-run results get a URL; "Terug naar serie" returns to results

**Files:**
- Modify: `frontend/src/App.tsx:72-73`
- Modify: `frontend/src/pages/RunSeries.tsx`
- Modify: `frontend/src/pages/RunSeriesStepDetail.tsx:77-80`
- Modify: `frontend/src/pages/SeriesDetail.tsx:149-172`

**Interfaces:**
- Consumes: existing `getControleSeriesRun(runId): Promise<ControleSeriesRun>` from `frontend/src/api/client.ts`.
- Produces: route `/controle-series/:id/run/:runId` (RunSeries in stored-results mode). Task 3's demo guide references this behavior.

- [ ] **Step 1: Add the route**

In `frontend/src/App.tsx`, after the existing `/controle-series/:id/run` route (line 72), add:

```tsx
<Route path="/controle-series/:id/run/:runId" element={<ProtectedPage><RunSeries /></ProtectedPage>} />
```

- [ ] **Step 2: Teach RunSeries about runId**

In `frontend/src/pages/RunSeries.tsx`:

1. Params and imports:

```tsx
import { getControleSeries, getControle, runControleSeries, getControleSeriesRun } from "@/api/client";
// ...
const { id, runId } = useParams<{ id: string; runId?: string }>();
```

2. Initial phase honors runId (replace the `useState<Phase>("upload")` line):

```tsx
const [phase, setPhase] = useState<Phase>(runId ? "loading" : "upload");
```

Extend the Phase type: `type Phase = "upload" | "running" | "results" | "loading";`

3. New effect to load a stored run (place after the existing series-loading effect):

```tsx
useEffect(() => {
  if (!runId) return;
  if (result && result.id === runId) return; // just navigated here after a live run
  setPhase("loading");
  getControleSeriesRun(runId)
    .then((run) => {
      setResult(run);
      setPhase("results");
    })
    .catch(() => {
      toast({ title: "Run niet gevonden", variant: "destructive" });
      navigate(`/controle-series/${id}`);
    });
}, [runId, id, result, navigate, toast]);
```

4. In `handleRun`, after `setResult(res); setPhase("results");` add:

```tsx
navigate(`/controle-series/${series.id}/run/${res.id}`, { replace: true });
```

(`navigate` must be added to the `useCallback` dependency array.)

5. "Opnieuw uitvoeren" button onClick becomes:

```tsx
onClick={() => {
  setPhase("upload");
  setResult(null);
  setAssignments({});
  setPool([]);
  navigate(`/controle-series/${id}/run`, { replace: true });
}}
```

6. Render the loading phase (next to the existing `phase === "running"` block):

```tsx
{phase === "loading" && (
  <div className="py-16 flex flex-col items-center justify-center text-center">
    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
    <h2 className="text-lg font-semibold">Resultaten laden...</h2>
  </div>
)}
```

- [ ] **Step 3: Point "Terug naar serie" at the stored run**

In `frontend/src/pages/RunSeriesStepDetail.tsx`, replace the header button's `onClick={() => navigate(-1)}` with:

```tsx
onClick={() => navigate(`/controle-series/${seriesId}/run/${runId}`)}
```

(Leave the error-state `navigate(-1)` back button as is.)

- [ ] **Step 4: Make SeriesDetail history rows clickable**

In `frontend/src/pages/SeriesDetail.tsx`, the run rows (line 149-172): add cursor + onClick on the run row div:

```tsx
<div
  key={run.id}
  className="p-3 rounded-lg border space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
  onClick={() => navigate(`/controle-series/${id}/run/${run.id}`)}
>
```

- [ ] **Step 5: Build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds, no new lint errors.

- [ ] **Step 6: Manual verification with the running app**

With backend + frontend running and seeded data: open a serie → Uitvoergeschiedenis row → results phase renders from the stored run at `/controle-series/:id/run/:runId`; click a step → "Terug naar serie" → back on results (not upload). Browser refresh on the results URL still shows results. "Opnieuw uitvoeren" returns to the upload form.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/RunSeries.tsx frontend/src/pages/RunSeriesStepDetail.tsx frontend/src/pages/SeriesDetail.tsx
git commit -m "feat: stored series runs get a permanent results URL"
```

---

### Task 2: Seeder rewrite — one Maandafsluiting flow

**Files:**
- Modify: `backend/seed_demo_data.py` (replace `seed_flow_bakkerij`, `seed_flow_jansen`, `seed_flow_van_dijk` and `main()`; keep every helper above them; small additions: `union_region`, operator label in `RuleBuilder.comparison`)
- Delete (via seeder run + git rm): `sample_files/bakkerij-de-gouden-korst/`, `sample_files/installatiebedrijf-jansen-en-zn/`, `sample_files/transportbedrijf-van-dijk/`

**Interfaces:**
- Consumes: all existing helpers in `seed_demo_data.py`; `run_controle(controle_id, RunControleRequest)`, `run_series(series_id, RunSeriesRequest)`; `storage.upload_pdf/delete_pdf/load_metadata/save_metadata`.
- Produces: seeded state used by Task 3's demo guide: klant "Hoveniersbedrijf De Groene Linde", global group "CAO Hoveniersbedrijf 2026", controles "Loonstrokencontrole", "Loonjournaal maandcontrole", "Medewerkersbestand aansluiting", "Loonaangifte controle", "Reserveringencontrole", serie "Maandafsluiting februari 2026", files in `sample_files/hoveniersbedrijf-de-groene-linde/`.

- [ ] **Step 1: Update module docstring and clear sample_files**

Docstring: describe the single flow. In `main()`, before seeding:

```python
if os.path.isdir(SAMPLE_DIR):
    shutil.rmtree(SAMPLE_DIR)
os.makedirs(SAMPLE_DIR, exist_ok=True)
```

- [ ] **Step 2: Add `union_region` helper and operator labels**

Below `labeled_value_region`:

```python
def union_region(regions):
    """Bounding union of same-label regions across identically laid out PDFs."""
    x0 = min(r["x"] for r in regions)
    y0 = min(r["y"] for r in regions)
    x1 = max(r["x"] + r["width"] for r in regions)
    y1 = max(r["y"] + r["height"] for r in regions)
    return {"page": regions[0]["page"], "x": x0, "y": y0,
            "width": x1 - x0, "height": y1 - y0}
```

In `RuleBuilder.comparison`, replace the hardcoded `"label": "=="` with:

```python
_OPERATOR_LABELS = {"equals": "==", "not_equals": "!=", "greater_or_equal": ">=",
                    "less_or_equal": "<=", "greater_than": ">", "less_than": "<"}
# in comparison():
"label": _OPERATOR_LABELS.get(operator, operator),
```

- [ ] **Step 3: Write the flow** (replaces the three `seed_flow_*` functions)

```python
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
```

Loonstrook generator (same function, continued). One payslip per medewerker plus one correctie-strook; field regions become the union across all 21 PDFs:

```python
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
```

Controle 1 — Loonstrokencontrole:

```python
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
```

Controle 2 — Loonjournaal maandcontrole (journaal PDF via `make_report`):

```python
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
```

Controle 3 — Medewerkersbestand aansluiting (xlsx, bakkerij-controle-B pattern):

```python
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
```

Controle 4 — Loonaangifte controle:

```python
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
```

Controle 5 — Reserveringencontrole:

```python
    r_filename = "Reserveringen_2026-02_De_Groene_Linde.pdf"
    r_pdf_id, r_pages, r_regions = make_report(
        r_filename, slug, "Reserveringenoverzicht februari 2026",
        meta_pairs=[
            ("Werkgever", f"{naam} (5012)"),
            ("Periode", periode),
            ("Totaal vakantiegeldreservering (EUR)", vg_totaal),
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
    f_r_totaal = pdf_field("Totaal vakantiegeldreservering", r_regions["Totaal vakantiegeldreservering (EUR)"])
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
```

Serie + runs:

```python
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
    return c1_id, file_strook["id"], strook_files, strook_names, correctie_path, correctie_filename
```

- [ ] **Step 4: Correctie-strook verification (state-neutral)**

```python
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
```

New `main()`:

```python
async def main():
    clear_all()
    if os.path.isdir(SAMPLE_DIR):
        shutil.rmtree(SAMPLE_DIR)
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    ctx = await seed_flow_groene_linde()
    await verify_correctie_strook(*ctx)
    verify_runs()
```

- [ ] **Step 5: Run the seeder**

Run: `cd backend && .venv/bin/python seed_demo_data.py`
Expected: `✓ Flow: ... 5 controles, 1 serie, 6 runs`, `✓ Correctie-strook: ...`, run listing with all `[success]`, serie `completed` with 5 × `passed`, exit 0. The Loonstrokencontrole run shows `velden 100/100, regels 80/80`.

If a field extraction fails (region drift on some strook), widen the union region padding in `labeled_value_region` usage or inspect the failing strook with the printed details; fix and re-run (the seeder is idempotent).

- [ ] **Step 6: Commit**

```bash
git add backend/seed_demo_data.py sample_files/
git commit -m "feat: reseed demo as single maandafsluiting flow with 20 loonstroken"
```

(`git add sample_files/` picks up the deleted old klant dirs and the new one.)

---

### Task 3: README demo guide rewrite

**Files:**
- Modify: `README.md` (sections "What the sample data represents", "Demo Data", "Demo Guide"; leave the rest untouched)

**Interfaces:**
- Consumes: seeded state from Task 2 (names, file names, counts), results-URL behavior from Task 1.
- Produces: click-by-click demo guide; every step verified against the actual app before commit.

- [ ] **Step 1: Rewrite the three sections**

Content requirements (exact copy drafted during implementation, verified against the UI):

- "What the sample data represents": one klant, Hoveniersbedrijf De Groene Linde (20 medewerkers); one maandafsluiting serie; the correctie-strook and its purpose.
- "Demo Data": the seed script now seeds one flow; still self-verifying; sample files in `sample_files/hoveniersbedrijf-de-groene-linde/`.
- "Demo Guide" storyline: the time math as an explicit talking point (20 loonstroken x 12 min nakijken + journaal 45 min + aangifte 20 min + reserveringen 20 min is ruim 5,5 uur handmatig per maand; met BCS ongeveer 2 minuten). Sections: prep, dashboard/klant, globale waarden, anatomy of the Loonstrokencontrole, the serie run with 23 file uploads (drag all 20 loonstroken into one slot), the correctie-strook catch beat (add the 21st file, re-run, exactly one strook flags "Uurloon voldoet aan CAO-minimum" red), geschiedenis + the permanent series-run URL ("Terug naar serie" returns to results).

- [ ] **Step 2: Verify every step click-by-click**

With seeded data and both servers running, walk the guide in the app; fix any mismatch between guide text and actual UI labels/counts.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite demo guide for maandafsluiting flow"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Fresh reseed + app walkthrough**

Reseed, restart backend, then in the app verify: dashboard stats populated; klant detail shows 5 controles + serie + history; serie run history row opens stored results at the new URL; step detail for the Loonstrokencontrole step shows 20 files in the Bestanden panel; "Terug naar serie" lands on results.

- [ ] **Step 2: Live catch moment rehearsal**

Run the serie via Uitvoeren with all files from `sample_files/hoveniersbedrijf-de-groene-linde/` plus the correctie-strook in the Loonstrook slot (21 files): serie stops after step 1 (status Gestopt, stappen 2-5 Overgeslagen), step 1 detail shows exactly one strook with the failed uurloon rule. This confirms both the catch moment and the conditional-skip talking point.

- [ ] **Step 3: Final commit if fixes were needed**
