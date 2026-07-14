import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.schemas import Controle, ControleCreate, ControleRunResult, ExtractionResponse, FieldResult, TestRunEntry
from services.controle_store import (
    delete_controle,
    get_controle,
    list_controles,
    save_controle,
    update_controle,
)
from services.extraction_service import extract_all_fields
from services.storage_backend import get_storage

router = APIRouter(prefix="/controles", tags=["controles"])


@router.post("", response_model=Controle)
async def create_controle(data: ControleCreate):
    controle_id = str(uuid.uuid4())
    controle = save_controle(controle_id, data)

    # Auto-copy to descendants if this controle belongs to a klant with children
    if data.klantId:
        from services.klant_store import list_descendants, get_klant, update_klant_source_controls
        descendants = list_descendants(data.klantId)
        for desc in descendants:
            new_id = str(uuid.uuid4())
            copy_data = ControleCreate(
                name=data.name,
                status=data.status,
                files=data.files,
                rules=data.rules,
                computedFields=data.computedFields,
                ruleGraph=data.ruleGraph,
                klantId=desc.id,
                klantName=desc.name,
            )
            save_controle(new_id, copy_data)

            # Track the source mapping on the descendant klant
            desc_klant = get_klant(desc.id)
            if desc_klant:
                source_ids = dict(desc_klant.sourceControlIds or {})
                source_ids[new_id] = controle_id
                update_klant_source_controls(desc.id, source_ids)

    return controle


@router.get("", response_model=list[Controle])
async def get_all_controles():
    return list_controles()


@router.get("/runs/all", response_model=list[ControleRunResult])
async def list_all_runs():
    storage = get_storage()
    runs: list[ControleRunResult] = []
    for rid in storage.list_controle_run_ids():
        content = storage.get_controle_run(rid)
        if content is not None:
            runs.append(ControleRunResult(**json.loads(content)))
    return sorted(runs, key=lambda r: r.runAt, reverse=True)


@router.get("/runs/{run_id}", response_model=ControleRunResult)
async def get_run(run_id: str):
    content = get_storage().get_controle_run(run_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return ControleRunResult(**json.loads(content))


@router.get("/runs/{run_id}/details", response_model=list[ExtractionResponse])
async def get_run_details(run_id: str):
    storage = get_storage()
    content = storage.get_controle_run_details(run_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Run details not found")
    return json.loads(content)


@router.get("/{controle_id}", response_model=Controle)
async def get_one_controle(controle_id: str):
    controle = get_controle(controle_id)
    if controle is None:
        raise HTTPException(status_code=404, detail="Controle not found.")
    return controle


@router.put("/{controle_id}", response_model=Controle)
async def update_one_controle(controle_id: str, data: ControleCreate):
    controle = update_controle(controle_id, data)
    if controle is None:
        raise HTTPException(status_code=404, detail="Controle not found.")
    return controle


@router.delete("/{controle_id}")
async def remove_controle(controle_id: str):
    deleted = delete_controle(controle_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Controle not found.")
    return {"detail": "Controle deleted."}


class RunControleRequest(BaseModel):
    files: dict[str, list[str] | str]  # file_id -> [pdf_id, ...] or pdf_id (backward compat)
    filenames: dict[str, str] = {}  # pdf_id -> filename (optional, for display)


@router.post("/{controle_id}/run", response_model=list[ExtractionResponse])
async def run_controle(controle_id: str, data: RunControleRequest):
    controle = get_controle(controle_id)
    if controle is None:
        raise HTTPException(status_code=404, detail="Controle not found.")
    if controle.status != "published":
        raise HTTPException(status_code=400, detail="Controle must be published to run.")

    storage = get_storage()
    responses: list[ExtractionResponse] = []

    # Normalize: wrap single strings in lists for backward compatibility
    normalized_files: dict[str, list[str]] = {}
    for key, val in data.files.items():
        if isinstance(val, str):
            normalized_files[key] = [val]
        else:
            normalized_files[key] = val

    import json as _json

    from services.translation_rules_store import get_translation_rules_dict
    translation_rules = get_translation_rules_dict()

    # Load spreadsheet grid data for any spreadsheet files
    grid_data: dict[str, dict] = {}
    for file_def in controle.files:
        if file_def.fileType == "spreadsheet" and file_def.spreadsheetId:
            grid_json = storage.get_spreadsheet_grid(file_def.spreadsheetId)
            if grid_json:
                grid_data[file_def.spreadsheetId] = _json.loads(grid_json)

    # Collect all fields across files for combined rule evaluation
    all_fields = []
    for file_def in controle.files:
        all_fields.extend(file_def.fields)

    for file_def in controle.files:
        is_first_file_def = file_def.id == controle.files[0].id

        if file_def.fileType == "spreadsheet":
            # Spreadsheet files: single extraction from controle definition
            ss_id = file_def.spreadsheetId
            grid = grid_data.get(ss_id) if ss_id else None
            field_results = []
            extracted_values: dict[str, str] = {}

            for field in file_def.fields:
                value = ""
                if grid and field.type == "cell" and field.cell_ref:
                    row_val = grid["rows"][field.cell_ref.row][field.cell_ref.col] if field.cell_ref.row < grid["row_count"] and field.cell_ref.col < grid["col_count"] else None
                    value = str(row_val) if row_val is not None else ""
                elif grid and field.type == "cell_range" and field.range_ref:
                    values = []
                    for r in range(field.range_ref.startRow, field.range_ref.endRow + 1):
                        for c in range(field.range_ref.startCol, field.range_ref.endCol + 1):
                            if r < grid["row_count"] and c < grid["col_count"]:
                                val = grid["rows"][r][c]
                                if val is not None:
                                    values.append(str(val))
                    value = ", ".join(values)

                extracted_values[field.label] = value
                fr_kwargs: dict = dict(
                    label=field.label,
                    field_type=field.type,
                    value=value,
                    status="ok" if value else "empty",
                    rule_results=[],
                    step_traces=[],
                )
                if field.type == "cell" and field.cell_ref:
                    fr_kwargs["value_found_x"] = field.cell_ref.col
                    fr_kwargs["value_found_y"] = field.cell_ref.row
                elif field.type == "cell_range" and field.range_ref:
                    fr_kwargs["resolved_region"] = {
                        "page": 1,
                        "x": field.range_ref.startCol,
                        "y": field.range_ref.startRow,
                        "width": field.range_ref.endCol - field.range_ref.startCol,
                        "height": field.range_ref.endRow - field.range_ref.startRow,
                    }
                field_results.append(FieldResult(**fr_kwargs))

            rule_results_list = []
            computed_values: dict[str, str] = {}
            if is_first_file_def and controle.rules:
                from services.rule_engine import RuleEngine
                engine = RuleEngine(
                    current_template_id=controle_id,
                    extracted_values=extracted_values,
                    grid_data=grid_data,
                    translation_rules=translation_rules,
                )
                computed_values, rule_results_list = engine.evaluate_all(
                    controle.rules, controle.computedFields
                )

            ss_filename = file_def.spreadsheetFilename or (ss_id or "")
            responses.append(ExtractionResponse(
                pdf_id=ss_id or "",
                template_id=controle_id,
                results=field_results,
                needs_review=any(r.status != "ok" for r in field_results),
                template_rule_results=rule_results_list,
                computed_values=computed_values,
                source_filename=ss_filename,
            ))
            continue

        # PDF handling: loop over all provided pdf_ids for this file_def
        pdf_ids = normalized_files.get(file_def.id, [])
        if not pdf_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Missing PDF for file '{file_def.label}' (id: {file_def.id}).",
            )

        for pdf_id in pdf_ids:
            if not storage.pdf_exists(pdf_id):
                raise HTTPException(status_code=404, detail=f"PDF {pdf_id} not found.")

            pdf_filename = data.filenames.get(pdf_id, pdf_id)

            with storage.pdf_temp_path(pdf_id) as pdf_path:
                field_results, rule_results, computed_values = extract_all_fields(
                    pdf_path=pdf_path,
                    fields=file_def.fields,
                    template_rules=controle.rules if is_first_file_def else [],
                    computed_fields=controle.computedFields if is_first_file_def else [],
                    template_id=controle_id,
                )

            responses.append(ExtractionResponse(
                pdf_id=pdf_id,
                template_id=controle_id,
                results=field_results,
                needs_review=any(r.status != "ok" for r in field_results),
                template_rule_results=rule_results,
                computed_values=computed_values,
                source_filename=pdf_filename,
            ))

    # Persist run result
    total_fields = sum(len(r.results) for r in responses)
    passed_fields = sum(len([f for f in r.results if f.status == "ok"]) for r in responses)
    all_rule_results = [rr for r in responses for rr in r.template_rule_results]
    rules_passed = len([rr for rr in all_rule_results if rr.passed])

    status = "success" if passed_fields == total_fields and rules_passed == len(all_rule_results) else "review" if passed_fields > 0 else "error"

    entries: list[TestRunEntry] = []
    for r in responses:
        prefix = f"{r.source_filename} → " if r.source_filename and len(responses) > 1 else ""
        for fr in r.results:
            entries.append(TestRunEntry(
                label=f"{prefix}{fr.label}",
                value=fr.value or "",
                status=fr.status,
                table_data=fr.table_data,
            ))
    for key, val in (responses[0].computed_values.items() if responses else []):
        entries.append(TestRunEntry(label=key, value=str(val), status="computed"))

    run_result = ControleRunResult(
        id=str(uuid.uuid4()),
        controleId=controle_id,
        controleName=controle.name,
        klantId=controle.klantId,
        klantName=controle.klantName,
        status=status,
        totalFields=total_fields,
        passedFields=passed_fields,
        failedFields=total_fields - passed_fields,
        rulesPassed=rules_passed,
        rulesTotal=len(all_rule_results),
        fileResults=[
            {
                "fileLabel": r.source_filename or f"File {i+1}",
                "passed": len([f for f in r.results if f.status == "ok"]),
                "total": len(r.results),
            }
            for i, r in enumerate(responses)
        ],
        entries=entries,
        runAt=datetime.now(timezone.utc),
    )
    storage.save_controle_run(run_result.id, run_result.model_dump_json(indent=2))

    # Persist full extraction details for the viewer
    details_json = json.dumps([r.model_dump() for r in responses], indent=2, default=str)
    storage.save_controle_run_details(run_result.id, details_json)

    return responses
