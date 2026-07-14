# Demo seed rebuild: Maandafsluiting februari 2026 + series-run result URL

Date: 2026-07-14
Status: approved (conversation 2026-07-14)

## Goal

A management demo must show, in one series run, that BCS replaces hours of manual
payslip checking with minutes of drag-drop-run. The current seed (three klanten,
two controles each, 1-2 files per run) proves the mechanics but not the scale.
Additionally, the "Terug naar serie" button on the series step-detail page loses
the run result and drops the user back on the upload form.

## Part 1 — Seeder: one deep, realistic flow

Replace the three seeded flows in `backend/seed_demo_data.py` with a single flow.

### Scenario

**Klant**: Hoveniersbedrijf De Groene Linde, 20 medewerkers, CAO Hoveniersbedrijf.
Month-end payroll close (maandafsluiting) for februari 2026. The manual version of
this task is checking every payslip by hand plus reconciling journaal, aangifte and
reserveringen: roughly 20 x 12 min + 3 x 20-45 min = 5.5 hours per month. BCS runs
it in about 2 minutes.

### Global values — group "CAO Hoveniersbedrijf 2026"

| Name | Type | Value |
|---|---|---|
| Loonheffingsnummer | text | 8456.78.901.L01 |
| Aantal medewerkers | number | 20 |
| CAO minimumuurloon | number | 14.06 |
| Vakantiegeldpercentage | number | 8 |
| Bruto loonsom februari | number | (sum of generated salaries) |
| Totaal vakantiegeldreservering | number | (8% of loonsom, same rounding as PDFs) |

### Generated files (`sample_files/hoveniersbedrijf-de-groene-linde/`)

- 20 x `Loonstrook_2026-02_<persnr>_<naam>.pdf` — identical layout, one per
  employee. Meta block: Werkgever, Loonheffingsnummer, Periode, Personeelsnummer,
  Medewerker, Uren per week, Uurloon (EUR), Bruto maandsalaris (EUR),
  Vakantiegeldpercentage, Vakantiegeldreservering (EUR). Detail table:
  loonstrookregels (bruto, loonheffing, netto, reserveringen).
- 1 x `Loonjournaal_2026-02_De_Groene_Linde.pdf` — meta: Periode, LH-nummer,
  Aantal medewerkers, Totaal bruto; journaalposten table.
- 1 x `Loonaangifte_2026-02_De_Groene_Linde.pdf` — meta: Periode, LH-nummer,
  Totaal loon loonheffing, Aantal inkomstenverhoudingen; aangifte table.
- 1 x `Reserveringen_2026-02_De_Groene_Linde.pdf` — meta: Periode, Totaal
  vakantiegeldreservering, Negatieve saldi; per-employee reserveringen table.
- 1 x `Medewerkers_2026-02_De_Groene_Linde.xlsx` — Persnr, Naam, Functie,
  Uren per week, Uurloon, Bruto maandsalaris. Embedded in the controle
  definition (spreadsheets are not uploaded at run time).
- 1 x `Loonstrook_2026-02_<persnr>_correctie.pdf` — same layout, uurloon 12.80
  (below CAO minimum). NOT part of any seeded run; exists only in sample_files
  for the live catch moment during the demo.

### Controles (4) and serie (1)

Serie **"Maandafsluiting februari 2026"**, klant De Groene Linde:

1. **Loonstrokencontrole** (always) — one PDF slot "Loonstrook" that receives all
   20 payslips in one run (the run endpoint loops over a list of pdf_ids per slot,
   `backend/routers/controles.py:227`). Fields: Periode, Loonheffingsnummer,
   Uurloon, Bruto maandsalaris, Vakantiegeldpercentage. Rules per strook:
   - Uurloon >= CAO minimumuurloon (global, greater_or_equal)
   - Vakantiegeldpercentage == global Vakantiegeldpercentage
   - Periode == literal "2026-02"
   - Loonheffingsnummer == global Loonheffingsnummer
2. **Loonjournaal aansluiting** (if_passed) — spreadsheet file first (rules are
   evaluated on the first file), journaal PDF second. Rules: agg_sum(salary col)
   == global loonsom; agg_count(persnr col) == global aantal; journaal Totaal
   bruto == global loonsom; journaal Aantal medewerkers == global aantal;
   Periode not_empty.
3. **Loonaangifte controle** (if_passed) — aangifte PDF. Rules: LH-nummer ==
   global; Totaal loon loonheffing == global loonsom; Aantal
   inkomstenverhoudingen == global aantal; Periode not_empty.
4. **Reserveringencontrole** (if_passed) — reserveringen PDF. Rules: Negatieve
   saldi == literal 0; Totaal vakantiegeldreservering == global; Periode
   not_empty.

Live series run = 23 PDF uploads (20 strookjes + journaal + aangifte +
reserveringen).

### Seeded run history

One run per controle (Loonstrokencontrole run receives all 20 strook pdf_ids)
plus one full series run. All green. `verify_runs()` keeps failing the seed
loudly if any field or rule does not pass.

### Field-region robustness across 20 PDFs

Field regions are defined once on the controle but extracted from 20 PDFs whose
value widths differ. Mitigation: compute each label's region per generated
strook with the existing `labeled_value_region`, then take the bounding union
across all 20 (plus the correctie-strook) and keep `extraction_mode: "word"`.
The seeded runs verify this against real extraction.

### Out of scope / kept

- `generate_sample_controle_pdfs.py` and `sample_pdfs/` stay as-is (used by the
  "build from scratch" demo beat).
- Templates, test runs and translation rules are still not cleared.
- Old `sample_files/<klant>/` directories for the removed flows are deleted.

## Part 2 — Series run result gets a URL

Problem: `RunSeries.tsx` keeps phase and result only in component state; the URL
stays `/controle-series/:id/run`. Step detail's "Terug naar serie" does
`navigate(-1)`, remounting RunSeries at the upload phase.

Changes (frontend only; the API `getControleSeriesRun(runId)` already exists):

1. New route `/controle-series/:id/run/:runId` in `App.tsx`, rendering the same
   `RunSeries` page.
2. `RunSeries` reads the optional `runId` param. When present it fetches the
   stored run, sets `result`, and renders the results phase directly (no upload
   UI, no slot loading requirement beyond series metadata).
3. After a live run completes, `navigate('/controle-series/{id}/run/{res.id}',
   { replace: true })` so results have a real URL and browser back behaves.
4. "Terug naar serie" in `RunSeriesStepDetail.tsx` navigates explicitly to
   `/controle-series/{seriesId}/run/{runId}` instead of `navigate(-1)`.
5. "Opnieuw uitvoeren" navigates to `/controle-series/{id}/run` (plain) and
   resets state.

Error handling: unknown `runId` shows the existing not-found/error pattern with
a back button. Loading state mirrors the existing "Laden..." pattern.

## Part 3 — README demo guide update

Rewrite "What the sample data represents", "Demo Data" and "Demo Guide" sections
for the new single-flow seed:

- Storyline: maandafsluiting for De Groene Linde; time math (±5.5 uur handmatig
  vs ±2 min) as an explicit talking point.
- Click-by-click: seed prep, dashboard/klant, globale waarden, anatomy of the
  Loonstrokencontrole, the 23-file series run, the correctie-strook catch moment
  (drag the extra strook into the Loonstrook slot alongside the 20, re-run, one
  strook flags "Uurloon >= CAO minimumuurloon" red), geschiedenis with the new
  permanent series-run URL.
- Every step verified against the actual seeded state before the guide is
  committed.

## Testing / verification

- Seeder: run `python seed_demo_data.py`; its self-verification executes real
  runs and exits non-zero on any failure.
- Manual check via the app: series run detail opens from Geschiedenis; step
  detail "Terug naar serie" lands on stored results; re-upload flow still works.
- Frontend: `npm run build` (and existing lint) passes.
- Correctie-strook: run the Loonstrokencontrole with 21 files and confirm
  exactly one strook fails exactly the uurloon rule.
