export interface Region {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CompareOperator =
  | "less_than" | "greater_than" | "equals" | "not_equals" | "less_or_equal" | "greater_or_equal"
  | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "in_array" | "not_in_array"
  | "matches_regex"
  | "is_empty" | "is_not_empty"
  | "date_before" | "date_after" | "date_between";
export type DataType = "string" | "number" | "integer" | "date" | "currency";
export type ExtractionMode = "strict" | "word" | "line" | "edge" | "paragraph";
export type MathOperation = "add" | "subtract" | "multiply" | "divide"
  | "modulo" | "abs" | "round" | "min" | "max" | "sum" | "average";
export type AggregateOperation = "sum" | "average" | "count" | "min" | "max";
export type RowFilterMode = "count" | "all_pass" | "any_pass";
export type CrossTemplateResolution = "latest_run" | "specific_run" | "live";

export interface Rule {
  type: "exact_match" | "data_type" | "range" | "one_of" | "pattern" | "not_empty" | "date_before" | "date_after" | "compare_field";
  expected_value?: string;
  data_type?: DataType;
  min_value?: number;
  max_value?: number;
  allowed_values?: string[];
  regex?: string;
  date_threshold?: string;
  compare_field_label?: string;
  compare_operator?: CompareOperator;
  compare_test_run_id?: string;
}

// --- Template-level rules system ---

export interface FieldRef {
  template_id?: string;
  template_name?: string;
  field_label: string;
  resolution?: CrossTemplateResolution;
  test_run_id?: string;
  file_id?: string;
  file_label?: string;
}

export type RuleOperand =
  | { type: "field_ref"; ref: FieldRef }
  | { type: "literal"; value: string; datatype?: DataType }
  | { type: "computed_ref"; computed_id: string }
  | { type: "column_ref"; ref: FieldRef; column_label: string }
  | { type: "formula"; expression: string; spreadsheet_id: string }
  | { type: "range_ref"; spreadsheet_id: string; range: CellRange }
  | { type: "global_value"; global_group_id: string; global_value_id: string };

export interface Condition {
  operand_a: RuleOperand;
  operator: CompareOperator;
  operand_b: RuleOperand;
  then_value: RuleOperand;
  else_value: RuleOperand;
}

export interface ValidationConfig {
  rule_type: Rule["type"];
  operand_a: RuleOperand;
  operand_b?: RuleOperand;
  operator?: CompareOperator;
  expected_value?: string;
  data_type?: DataType;
  min_value?: number;
  max_value?: number;
  allowed_values?: string[];
  regex?: string;
  date_threshold?: string;
}

export interface ComputationConfig {
  operation: MathOperation | AggregateOperation | "row_filter" | "signal_lookup";
  operands: RuleOperand[];
  output_label: string;
  output_datatype?: DataType;
  condition?: Condition;
  row_filter_mode?: RowFilterMode;
  signal_lookup_config?: SignalLookupConfig;
}

export interface TemplateRule {
  id: string;
  name: string;
  type: "validation" | "computation";
  enabled: boolean;
  validation?: ValidationConfig;
  computation?: ComputationConfig;
}

export interface ComputedField {
  id: string;
  label: string;
  template_id: string;
  rule_id: string;
  datatype?: DataType;
}

export interface TemplateRuleResult {
  rule_id: string;
  rule_name: string;
  passed: boolean;
  message: string;
  computed_value?: string;
}

// --- React Flow node types for Rules editor ---

export type RuleNodeType = "field_input" | "literal_input" | "math_operation" | "comparison" | "validation" | "condition" | "table_column" | "table_aggregate" | "table_row_filter" | "formula" | "cell_range" | "signal_lookup" | "global_value_input" | "custom_script";

export interface RuleNodeData {
  label: string;
  nodeType: RuleNodeType;
  // field_input: which field this references
  fieldRef?: FieldRef;
  // literal_input: constant value
  literalValue?: string;
  literalDatatype?: DataType;
  // math_operation: which op
  mathOperation?: MathOperation;
  // comparison: operator
  comparisonOperator?: CompareOperator;
  // validation: rule type
  validationRuleType?: Rule["type"];
  validationConfig?: Partial<ValidationConfig>;
  // computed_output: output label and type
  outputLabel?: string;
  outputDatatype?: DataType;
  // condition: if/then/else
  condition?: Condition;
  // field metadata
  fieldType?: "static" | "dynamic" | "table";
  tablePreview?: string[][];  // [[col1, col2], [val1, val2], ...] for tooltip
  // table_column: which table field + column
  tableFieldRef?: FieldRef;
  tableColumnLabel?: string;
  tableColumnId?: string;
  // table_aggregate: operation + optional column selection (when source is a table field_input)
  aggregateOperation?: AggregateOperation;
  selectedColumnLabel?: string;
  // table_row_filter: mode
  rowFilterMode?: RowFilterMode;
  // Spreadsheet formula node
  formulaExpression?: string;
  spreadsheetId?: string;
  // Cell range node
  rangeExpression?: string;  // e.g. "B2:B50"
  cellRange?: CellRange;
  // Signal lookup node
  signalSpreadsheetId?: string;
  signalKeyColumn?: string;
  signalSignalColumn?: string;
  // Last evaluated value (for display)
  lastValue?: string;
  lastPassed?: boolean;
  // Global value reference
  globalGroupId?: string;
  globalValueId?: string;
  groupName?: string;
  globalDataType?: "text" | "number" | "date" | "boolean";
  // Custom script node
  customScript?: string;
  customScriptResult?: string;
}

// --- Chain step types ---

export type ChainStepCategory = "search" | "value";

export type SearchStepType = "exact_position" | "vertical_slide" | "full_page_search" | "region_search" | "block_search" | "bracket_search" | "area_search";
export type ValueStepType = "offset_value" | "adjacent_scan" | "block_value" | "intersection_value" | "area_text_value";

export interface ChainStep {
  id: string;
  category: ChainStepCategory;
  type: string;
  // Search config
  slide_tolerance?: number;
  search_region?: Region;
  // Block search/value config
  block_extract_mode?: "same_block" | "rest_of_block" | "next_block";
  // Value config
  search_direction?: string;
}

export interface StepTrace {
  step_id: string;
  step_type: string;
  category: string;
  resolved: boolean;
  detail: string;
  region?: Region;
}

export type AnchorRole = "primary" | "secondary" | "area_top" | "area_bottom";
export type AnchorMode = "static" | "single" | "bracket" | "area_value" | "area_locator" | "area_bracket";

export interface Anchor {
  id: string;
  role: AnchorRole;
  region: Region;
  expected_text: string;
}

export interface TableColumn {
  id: string;
  label: string;
  x: number;
}

export type TableEndAnchorMode = "none" | "text" | "end_of_page";

export interface TableConfig {
  table_region: Region;
  columns: TableColumn[];
  header_row: boolean;
  key_column_id?: string;
  end_anchor_mode?: TableEndAnchorMode;
  end_anchor_text?: string;
}

export interface Field {
  id: string;
  label: string;
  type: "static" | "dynamic" | "table" | "cell" | "cell_range";
  anchor_mode: AnchorMode;
  anchors: Anchor[];
  value_region: Region;
  anchor_region?: Region;
  expected_anchor_text?: string;
  rules: Rule[];                            // Legacy field-level rules (backward compat)
  value_format?: DataType;
  detected_datatype?: DataType;
  extraction_mode?: ExtractionMode;
  chain: ChainStep[];
  source?: "a" | "b";
  table_config?: TableConfig;
  // Spreadsheet cell fields
  cell_ref?: CellRef;
  range_ref?: CellRange;
}

export interface Template {
  id: string;
  name: string;
  fields: Field[];
  created_at: string;
  mode?: "single" | "comparison";
  rules: TemplateRule[];
  computed_fields: ComputedField[];
  rule_graph?: { nodes: unknown[]; edges: unknown[] };
}

export interface RuleResult {
  rule_type: string;
  passed: boolean;
  message: string;
}

export type TableRow = Record<string, string>;

export interface FieldResult {
  label: string;
  field_type: "static" | "dynamic" | "table" | "cell" | "cell_range";
  value: string;
  status: "ok" | "anchor_mismatch" | "anchor_not_found" | "anchor_shifted" | "anchor_relocated" | "empty" | "rule_failed";
  source?: "a" | "b";
  expected_anchor?: string;
  actual_anchor?: string;
  anchor_shift?: string;
  anchor_dx?: number;
  anchor_dy?: number;
  value_found_x?: number;
  value_found_y?: number;
  value_found_width?: number;
  anchors_found?: Record<string, { x: number; y: number; text: string; width: number; height: number }>;
  table_data?: TableRow[];
  resolved_table_height?: number;
  resolved_region?: Region;
  rule_results: RuleResult[];
  step_traces: StepTrace[];
  detected_datatype?: DataType;
}

export interface ExtractionResponse {
  pdf_id: string;
  template_id: string;
  results: FieldResult[];
  needs_review: boolean;
  pdf_id_b?: string;
  template_rule_results: TemplateRuleResult[];
  computed_values: Record<string, string>;
  source_filename?: string;  // NEW: identifies which uploaded file produced this response
}

export interface UploadedFile {
  id: string;           // pdf_id or spreadsheet_id
  filename: string;
  type: "pdf" | "spreadsheet";
}

// Layout analysis types
export interface LayoutLine {
  text: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface LayoutBlock {
  id: string;
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  lines: LayoutLine[];
}

export interface TestRunEntry {
  label: string;
  value: string;
  status: string;
  table_data?: Record<string, string>[];
}

// --- Controle (unified control entity) ---

export interface SheetData {
  headers: string[];
  rows: CellValue[][];
  rowCount: number;
  colCount: number;
}

export type CellValue = string | number | boolean | null;

export interface CellRef {
  col: number;
  row: number;
}

export interface CellRange {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export interface SignalLookupConfig {
  spreadsheet_id: string;
  key_column: string;
  signal_column: string;
}

export interface ControleFile {
  id: string;
  label: string;
  fileType: "pdf" | "spreadsheet";
  // PDF-specific
  pdfId: string | null;
  pdfFilename: string | null;
  pageCount: number;
  // Spreadsheet-specific
  spreadsheetId: string | null;
  spreadsheetFilename: string | null;
  sheetData: SheetData | null;
  // Shared
  fields: Field[];
  extractionResults: FieldResult[] | null;
}

export type ControleStatus = "draft" | "published";

export interface Klant {
  id: string;
  name: string;
  medewerkerCount?: number;
  parentId?: string | null;
  sourceControlIds?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Controle {
  id: string;
  name: string;
  status: ControleStatus;
  files: ControleFile[];
  rules: TemplateRule[];
  computedFields: ComputedField[];
  ruleGraph: { nodes: unknown[]; edges: unknown[] } | null;
  klantId?: string;
  klantName?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type WizardTab = "naam" | "bestanden" | "regels" | "opslaan" | string;

export interface ControleRunResult {
  id: string;
  controleId: string;
  controleName: string;
  klantId?: string;
  klantName?: string;
  status: "success" | "review" | "error";
  totalFields: number;
  passedFields: number;
  failedFields: number;
  rulesPassed: number;
  rulesTotal: number;
  fileResults: { fileLabel: string; passed: number; total: number }[];
  entries: TestRunEntry[];
  runAt: string;
}

export interface TestRun {
  id: string;
  pdf_id: string;
  pdf_filename: string;
  template_name?: string;
  template_id?: string;
  entries: TestRunEntry[];
  created_at: string;
}

// --- Controle Series ---

export type SeriesStepCondition = "always" | "if_passed" | "if_failed";

export interface ControleSeriesStep {
  id: string;
  order: number;
  controleId: string;
  controleName: string;
  condition: SeriesStepCondition;
}

export interface ControleSeries {
  id: string;
  name: string;
  klantId: string;
  klantName: string;
  steps: ControleSeriesStep[];
  createdAt: string;
  updatedAt: string;
}

export type SeriesStepResultStatus = "passed" | "failed" | "skipped" | "error";

export interface ControleSeriesStepResult {
  stepId: string;
  controleId: string;
  controleName: string;
  status: SeriesStepResultStatus;
  controleRunId?: string;
}

export type SeriesRunStatus = "running" | "completed" | "stopped";

export interface ControleSeriesRun {
  id: string;
  seriesId: string;
  seriesName: string;
  klantId: string;
  klantName: string;
  status: SeriesRunStatus;
  stepResults: ControleSeriesStepResult[];
  runAt: string;
}

// --- Run Result Viewer ---

export interface FileGroup {
  label: string;
  files: FileEntry[];
}

export interface FileEntry {
  fileId: string;
  filename: string;
  fileType: "pdf" | "spreadsheet";
  results: FieldResult[];
  ruleResults: TemplateRuleResult[];
  computedValues: Record<string, string>;
  passed: number;
  total: number;
}

// --- Global Values ---

export interface GlobalValue {
  id: string;
  name: string;
  dataType: "text" | "number" | "date" | "boolean";
  value: string;
}

export interface AuditEntry {
  timestamp: string;
  action: "created" | "pdf_uploaded" | "values_confirmed" | "pdf_template_updated";
  details: {
    filename?: string;
    replacedFilename?: string;
    previousValues?: GlobalValue[];
    newValues?: GlobalValue[];
    changedFields?: string[];
    mode?: string;
    fieldCount?: number;
  };
}

export interface GlobalValueGroup {
  id: string;
  name: string;
  version: number;
  values: GlobalValue[];
  createdAt: string;
  updatedAt: string;
  mode: "manual" | "pdf";
  templateId: string | null;
  auditLog: AuditEntry[];
}

export interface GlobalValuePdfTemplate {
  id: string;
  groupId: string;
  pdfId: string;
  filename: string;
  fields: Field[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionPreview {
  extractedValues: GlobalValue[];
  currentValues: GlobalValue[];
  fieldResults: FieldResult[];
}
