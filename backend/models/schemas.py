from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class Region(BaseModel):
    """A rectangular region on a PDF page, in normalized 0-1 coordinates."""
    page: int       # 1-indexed page number
    x: float
    y: float
    width: float
    height: float


CompareOperator = Literal[
    "less_than", "greater_than", "equals", "not_equals", "less_or_equal", "greater_or_equal",
    "contains", "not_contains", "starts_with", "ends_with",
    "in_array", "not_in_array",
    "matches_regex",
    "is_empty", "is_not_empty",
    "date_before", "date_after", "date_between",
]
DataType = Literal["string", "number", "integer", "date", "currency"]
MathOperation = Literal["add", "subtract", "multiply", "divide", "modulo", "abs", "round", "min", "max", "sum", "average"]
AggregateOperation = Literal["agg_sum", "agg_average", "agg_count", "agg_min", "agg_max"]
RowFilterMode = Literal["count", "all_pass", "any_pass"]
CrossTemplateResolution = Literal["latest_run", "specific_run", "live"]


class Rule(BaseModel):
    """A legacy field-level validation rule (kept for backward compatibility)."""
    type: Literal["exact_match", "data_type", "range", "one_of", "pattern", "not_empty", "empty", "date_before", "date_after", "compare_field"]
    expected_value: str | None = None
    data_type: DataType | None = None
    min_value: float | None = None
    max_value: float | None = None
    allowed_values: list[str] | None = None
    regex: str | None = None
    date_threshold: str | None = None
    compare_field_label: str | None = None
    compare_operator: CompareOperator | None = None
    compare_test_run_id: str | None = None


class RuleResult(BaseModel):
    """Result of validating a single rule."""
    rule_type: str
    passed: bool
    message: str


# --- Template-level rules system ---

class FieldRef(BaseModel):
    """Reference to a field, possibly in another template."""
    template_id: str | None = None          # omit for current template
    template_name: str | None = None        # display name
    field_label: str
    resolution: CrossTemplateResolution | None = None  # for cross-template refs
    test_run_id: str | None = None          # when resolution = "specific_run"


class CellRange(BaseModel):
    """A cell range in a spreadsheet."""
    startCol: int
    startRow: int
    endCol: int
    endRow: int


class RuleOperand(BaseModel):
    """An operand in a rule expression."""
    type: Literal["field_ref", "literal", "computed_ref", "column_ref", "formula", "range_ref", "global_value"]
    ref: FieldRef | None = None             # when type = "field_ref" or "column_ref"
    value: str | None = None                # when type = "literal"
    datatype: DataType | None = None        # when type = "literal"
    computed_id: str | None = None          # when type = "computed_ref"
    column_label: str | None = None         # when type = "column_ref"
    # Spreadsheet formula
    expression: str | None = None           # when type = "formula"
    spreadsheet_id: str | None = None       # when type = "formula" or "range_ref"
    # Cell range
    range: CellRange | None = None          # when type = "range_ref"
    # Global value reference
    global_group_id: str | None = None       # when type = "global_value"
    global_value_id: str | None = None       # when type = "global_value"


class Condition(BaseModel):
    """Conditional expression (if/then/else)."""
    operand_a: RuleOperand
    operator: CompareOperator
    operand_b: RuleOperand
    then_value: RuleOperand
    else_value: RuleOperand


class SignalLookupConfig(BaseModel):
    """Configuration for a signal lookup node."""
    spreadsheet_id: str
    key_column: str
    signal_column: str


class ValidationConfig(BaseModel):
    """Configuration for a validation rule."""
    rule_type: Literal["exact_match", "data_type", "range", "one_of", "pattern", "not_empty", "empty", "date_before", "date_after", "compare_field"]
    operand_a: RuleOperand
    operand_b: RuleOperand | None = None
    operator: CompareOperator | None = None
    # Inline config for simple rules
    expected_value: str | None = None
    data_type: DataType | None = None
    min_value: float | None = None
    max_value: float | None = None
    allowed_values: list[str] | None = None
    regex: str | None = None
    date_threshold: str | None = None


class ComputationConfig(BaseModel):
    """Configuration for a computation rule."""
    operation: str  # MathOperation | AggregateOperation | "row_filter"
    operands: list[RuleOperand]
    output_label: str
    output_datatype: DataType | None = None
    condition: Condition | None = None      # for if/then/else
    row_filter_mode: RowFilterMode | None = None  # for row_filter operation
    signal_lookup_config: SignalLookupConfig | None = None  # for signal_lookup operation


class TemplateRule(BaseModel):
    """A template-level rule (validation or computation)."""
    id: str
    name: str
    type: Literal["validation", "computation"]
    enabled: bool = True
    validation: ValidationConfig | None = None
    computation: ComputationConfig | None = None


class ComputedField(BaseModel):
    """A computed field produced by a computation rule."""
    id: str
    label: str
    template_id: str
    rule_id: str
    datatype: DataType | None = None


class TemplateRuleResult(BaseModel):
    """Result of evaluating a template-level rule."""
    rule_id: str
    rule_name: str
    passed: bool
    message: str
    computed_value: str | None = None       # for computation rules


# --- Chain step system ---

class LayoutLine(BaseModel):
    """A single line within a layout block."""
    text: str


class LayoutBlock(BaseModel):
    """A text block detected by pdfminer's layout analysis."""
    id: str
    text: str
    bbox: dict  # { x, y, width, height } normalized 0-1
    lines: list[LayoutLine] = []


class ChainStep(BaseModel):
    """One step in a configurable chain pipeline (search + value only)."""
    id: str
    category: Literal["search", "value", "validate"]  # validate kept for backward compat
    type: str  # Step type within category
    # Search step config
    slide_tolerance: float | None = None        # vertical_slide: default 0.3
    search_region: Region | None = None         # region_search: custom search area
    # Block search/value config
    block_extract_mode: Literal["same_block", "rest_of_block", "next_block"] | None = None
    # Value step config
    search_direction: str | None = None         # adjacent_scan: "right" or "below"
    # Legacy validate step config (kept for backward compat, ignored in new system)
    expected_value: str | None = None
    data_type: DataType | None = None
    min_value: float | None = None
    max_value: float | None = None
    allowed_values: list[str] | None = None
    regex: str | None = None
    date_threshold: str | None = None
    compare_field_label: str | None = None
    compare_operator: CompareOperator | None = None
    compare_test_run_id: str | None = None


class StepTrace(BaseModel):
    """Trace of a single chain step execution."""
    step_id: str
    step_type: str
    category: str
    resolved: bool
    detail: str
    region: Region | None = None


class Anchor(BaseModel):
    """A named anchor point used to locate a field's value."""
    id: str
    role: Literal["primary", "secondary", "area_top", "area_bottom"]
    region: Region
    expected_text: str


class TableColumn(BaseModel):
    """A column defined by its left-edge x position within a table."""
    id: str
    label: str              # User-provided column header label
    x: float                # Normalized x position of left edge (0-1, page-relative)


class TableConfig(BaseModel):
    """Configuration for a table field."""
    table_region: Region            # Full table bounding box
    columns: list[TableColumn] = [] # Sorted by x; widths derived from gaps between adjacent columns
    header_row: bool = True         # Whether first detected row is a header
    key_column_id: str | None = None  # Column that always has data; rows where this col is empty merge upward
    end_anchor_mode: Literal["none", "text", "end_of_page"] = "none"  # How to determine table bottom
    end_anchor_text: str | None = None  # Text that marks end of table (when mode = "text")


ExtractionMode = Literal["strict", "word", "line", "edge", "paragraph"]


class CellRef(BaseModel):
    """A single cell reference in a spreadsheet."""
    col: int
    row: int


class Field(BaseModel):
    """A labeled extraction field in a template."""
    id: str
    label: str
    type: Literal["static", "dynamic", "table", "cell", "cell_range"]
    anchor_mode: Literal["static", "single", "bracket", "area_value", "area_locator", "area_bracket"] = "static"
    anchors: list[Anchor] = []
    value_region: Region | None = None
    anchor_region: Region | None = None
    expected_anchor_text: str | None = None
    rules: list[Rule] = []                  # Legacy field-level rules (kept for backward compat)
    value_format: DataType | None = None
    detected_datatype: DataType | None = None  # Auto-detected datatype after extraction
    extraction_mode: ExtractionMode = "word"
    chain: list[ChainStep] = []
    source: Literal["a", "b"] = "a"
    table_config: TableConfig | None = None
    cell_ref: CellRef | None = None
    range_ref: CellRange | None = None


class DetectFormatRequest(BaseModel):
    pdf_id: str
    region: Region


class TemplateCreate(BaseModel):
    name: str
    fields: list[Field]
    mode: Literal["single", "comparison"] = "single"
    rules: list[TemplateRule] = []
    computed_fields: list[ComputedField] = []
    rule_graph: dict | None = None  # React Flow {nodes, edges} for visual persistence


class Template(BaseModel):
    id: str
    name: str
    fields: list[Field]
    created_at: datetime
    mode: Literal["single", "comparison"] = "single"
    rules: list[TemplateRule] = []
    computed_fields: list[ComputedField] = []
    rule_graph: dict | None = None  # React Flow {nodes, edges} for visual persistence


class TestRequest(BaseModel):
    pdf_id: str
    fields: list[Field]
    pdf_id_b: str | None = None
    rules: list[TemplateRule] = []
    computed_fields: list[ComputedField] = []


class ExtractionRequest(BaseModel):
    pdf_id: str
    template_id: str
    pdf_id_b: str | None = None


class FieldResult(BaseModel):
    label: str
    field_type: Literal["static", "dynamic", "table", "cell", "cell_range"]
    value: str
    status: Literal["ok", "anchor_mismatch", "anchor_not_found", "anchor_shifted", "anchor_relocated", "empty", "rule_failed"]
    source: Literal["a", "b"] = "a"
    expected_anchor: str | None = None
    actual_anchor: str | None = None
    anchor_shift: str | None = None
    anchor_dx: float | None = None
    anchor_dy: float | None = None
    value_found_x: float | None = None
    value_found_y: float | None = None
    value_found_width: float | None = None
    anchors_found: dict[str, dict] = {}
    table_data: list[dict] | None = None
    resolved_table_height: float | None = None  # Actual table height after end-anchor resolution
    resolved_region: Region | None = None  # Expanded region after applying extraction_mode
    rule_results: list[RuleResult] = []
    step_traces: list[StepTrace] = []
    detected_datatype: DataType | None = None  # Auto-detected datatype


class ExtractionResponse(BaseModel):
    pdf_id: str
    template_id: str
    results: list[FieldResult]
    needs_review: bool
    pdf_id_b: str | None = None
    template_rule_results: list[TemplateRuleResult] = []
    computed_values: dict[str, str] = {}
    source_filename: str | None = None  # NEW: identifies which uploaded file produced this response


class TestRunEntry(BaseModel):
    """A single field's extracted key-value pair from a test run."""
    label: str
    value: str
    status: str
    table_data: list[dict[str, str]] | None = None  # For table fields: row data


class TestRunCreate(BaseModel):
    """Request body to save a test run."""
    pdf_id: str
    pdf_filename: str
    template_name: str | None = None
    template_id: str | None = None
    entries: list[TestRunEntry]


class TestRun(BaseModel):
    """A persisted test run with extracted key-value pairs."""
    id: str
    pdf_id: str
    pdf_filename: str
    template_name: str | None = None
    template_id: str | None = None
    entries: list[TestRunEntry]
    created_at: datetime


# --- Controle (unified control entity) ---

class SheetData(BaseModel):
    """Parsed spreadsheet grid data."""
    headers: list[str]
    rows: list[list]  # 2D grid (row-major, excludes header row)
    rowCount: int
    colCount: int


class SpreadsheetUploadResponse(BaseModel):
    """Response from spreadsheet upload."""
    spreadsheet_id: str
    filename: str
    headers: list[str]
    rows: list[list]
    row_count: int
    col_count: int


class ControleFile(BaseModel):
    """A single file definition within a Controle."""
    id: str
    label: str
    fileType: Literal["pdf", "spreadsheet"] = "pdf"
    # PDF-specific
    pdfId: str | None = None
    pdfFilename: str | None = None
    pageCount: int = 0
    # Spreadsheet-specific
    spreadsheetId: str | None = None
    spreadsheetFilename: str | None = None
    sheetData: SheetData | None = None
    # Shared
    fields: list[Field] = []
    extractionResults: list[FieldResult] | None = None


# --- Klant (customer) ---

class KlantCreate(BaseModel):
    """Request body to create or update a klant."""
    name: str
    medewerkerCount: int | None = None
    parentId: str | None = None


class Klant(BaseModel):
    """A persisted klant (customer)."""
    id: str
    name: str
    medewerkerCount: int | None = None
    parentId: str | None = None
    sourceControlIds: dict[str, str] | None = None
    createdAt: datetime
    updatedAt: datetime


class TranslationRule(BaseModel):
    """A translation rule from the Regelbibliotheek."""
    id: str
    code: str
    rapport: str
    teamId: str
    teamName: str
    translation: str
    lastModified: datetime


class ControleRunResult(BaseModel):
    """A persisted result of running a controle."""
    id: str
    controleId: str
    controleName: str
    klantId: str | None = None
    klantName: str | None = None
    status: Literal["success", "review", "error"]
    totalFields: int
    passedFields: int
    failedFields: int
    rulesPassed: int
    rulesTotal: int
    fileResults: list[dict] = []  # Per-file summary
    entries: list[TestRunEntry] = []  # Extracted field values for reuse
    runAt: datetime


class ControleCreate(BaseModel):
    """Request body to create or update a controle."""
    name: str
    status: Literal["draft", "published"] = "draft"
    files: list[ControleFile] = []
    rules: list[TemplateRule] = []
    computedFields: list[ComputedField] = []
    ruleGraph: dict | None = None
    klantId: str | None = None
    klantName: str | None = None
    createdBy: str | None = None


class Controle(BaseModel):
    """A persisted controle with files, fields, and rules."""
    id: str
    name: str
    status: Literal["draft", "published"] = "draft"
    files: list[ControleFile] = []
    rules: list[TemplateRule] = []
    computedFields: list[ComputedField] = []
    ruleGraph: dict | None = None
    klantId: str | None = None
    klantName: str | None = None
    createdBy: str | None = None
    createdAt: datetime
    updatedAt: datetime


# --- Controle Series ---

class ControleSeriesStep(BaseModel):
    """A single step in a controle series."""
    id: str
    order: int
    controleId: str
    controleName: str
    condition: Literal["always", "if_passed", "if_failed"] = "always"


class ControleSeriesCreate(BaseModel):
    """Request body to create or update a controle series."""
    name: str
    klantId: str
    klantName: str
    steps: list[ControleSeriesStep] = []


class ControleSeries(BaseModel):
    """A persisted controle series."""
    id: str
    name: str
    klantId: str
    klantName: str
    steps: list[ControleSeriesStep] = []
    createdAt: datetime
    updatedAt: datetime


class ControleSeriesStepResult(BaseModel):
    """Result of a single step in a series run."""
    stepId: str
    controleId: str
    controleName: str
    status: Literal["passed", "failed", "skipped", "error"]
    controleRunId: str | None = None


class ControleSeriesRun(BaseModel):
    """A persisted result of running a controle series."""
    id: str
    seriesId: str
    seriesName: str
    klantId: str
    klantName: str
    status: Literal["running", "completed", "stopped"]
    stepResults: list[ControleSeriesStepResult] = []
    runAt: datetime


# --- Global Values ---

class GlobalValue(BaseModel):
    """A single named value within a global value group."""
    id: str
    name: str
    dataType: Literal["text", "number", "date", "boolean"]
    value: str = ""


class AuditEntry(BaseModel):
    """A single event in a global value group's audit trail."""
    timestamp: str
    action: Literal["created", "pdf_uploaded", "values_confirmed", "pdf_template_updated"]
    details: dict = {}


class GlobalValueGroupCreate(BaseModel):
    """Request body to create or update a global value group."""
    name: str
    values: list[GlobalValue] = []
    mode: Literal["manual", "pdf"] = "manual"


class GlobalValueGroup(BaseModel):
    """A persisted global value group with auto-incrementing version."""
    id: str
    name: str
    version: int = 1
    values: list[GlobalValue] = []
    createdAt: str
    updatedAt: str
    mode: Literal["manual", "pdf"] = "manual"
    templateId: str | None = None
    auditLog: list[AuditEntry] = []


class GlobalValuePdfTemplate(BaseModel):
    """PDF template linked to a global value group."""
    id: str
    groupId: str
    pdfId: str
    filename: str
    fields: list[Field] = []
    createdAt: str
    updatedAt: str
