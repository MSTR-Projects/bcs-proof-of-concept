import axios from "axios";
import type { Template, Field, ExtractionResponse, Region, LayoutBlock, TestRun, TemplateRule, TemplateRuleResult, ComputedField, Controle, ControleFile, ControleRunResult, FieldResult, Klant, ControleSeries, ControleSeriesRun, GlobalValueGroup, GlobalValue, GlobalValuePdfTemplate, ExtractionPreview, AuditEntry } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

export async function uploadPdf(
  file: File,
): Promise<{ pdf_id: string; page_count: number; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/pdfs/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export interface PdfInfo {
  pdf_id: string;
  filename: string;
  page_count: number;
}

export async function listPdfs(): Promise<PdfInfo[]> {
  const response = await api.get("/pdfs");
  return response.data;
}

export async function deletePdf(pdfId: string): Promise<void> {
  await api.delete(`/pdfs/${pdfId}`);
}

export function getPdfUrl(pdfId: string): string {
  return `${api.defaults.baseURL}/pdfs/${pdfId}`;
}

export async function createTemplate(
  name: string,
  fields: Field[],
  mode: "single" | "comparison" = "single",
  rules: TemplateRule[] = [],
  computed_fields: ComputedField[] = [],
  rule_graph?: { nodes: unknown[]; edges: unknown[] },
): Promise<Template> {
  const response = await api.post("/templates", { name, fields, mode, rules, computed_fields, rule_graph });
  return response.data;
}

export async function listTemplates(): Promise<Template[]> {
  const response = await api.get("/templates");
  return response.data;
}

export async function getTemplate(templateId: string): Promise<Template> {
  const response = await api.get(`/templates/${templateId}`);
  return response.data;
}

export async function updateTemplate(
  templateId: string,
  name: string,
  fields: Field[],
  mode: "single" | "comparison" = "single",
  rules: TemplateRule[] = [],
  computed_fields: ComputedField[] = [],
  rule_graph?: { nodes: unknown[]; edges: unknown[] },
): Promise<Template> {
  const response = await api.put(`/templates/${templateId}`, {
    name,
    fields,
    mode,
    rules,
    computed_fields,
    rule_graph,
  });
  return response.data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await api.delete(`/templates/${templateId}`);
}

// Extract text from a single region of a PDF (used to auto-populate exact_match value)
export async function extractRegion(
  pdfId: string,
  region: Region,
): Promise<string> {
  const response = await api.post(`/pdfs/${pdfId}/extract-region`, region);
  return response.data.text;
}

// Auto-detect value format from a region of the PDF
export async function detectFormat(
  pdfId: string,
  region: Region,
): Promise<{ text: string; format: string }> {
  const response = await api.post(`/pdfs/${pdfId}/detect-format`, region);
  return response.data;
}

// Get layout blocks for a page of a PDF
export async function getPageLayout(pdfId: string, page: number, lineMargin: number = 1.0): Promise<LayoutBlock[]> {
  const response = await api.get(`/pdfs/${pdfId}/layout`, { params: { page, line_margin: lineMargin } });
  return response.data.blocks;
}

// Get word-level bounding boxes for a PDF page
export interface WordInfo {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getPageWords(pdfId: string, page: number): Promise<WordInfo[]> {
  const response = await api.get(`/pdfs/${pdfId}/words`, { params: { page } });
  return response.data.words;
}

// --- Spreadsheets ---

export interface SpreadsheetUploadResponse {
  spreadsheet_id: string;
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  col_count: number;
}

export async function uploadSpreadsheet(
  file: File,
): Promise<SpreadsheetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/spreadsheets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getSpreadsheet(
  spreadsheetId: string,
): Promise<SpreadsheetUploadResponse> {
  const response = await api.get(`/spreadsheets/${spreadsheetId}`);
  return response.data;
}

export async function getSpreadsheetCell(
  spreadsheetId: string,
  col: number,
  row: number,
): Promise<{ value: string | number | boolean | null }> {
  const response = await api.get(`/spreadsheets/${spreadsheetId}/cell`, {
    params: { col, row },
  });
  return response.data;
}

export async function getSpreadsheetRange(
  spreadsheetId: string,
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): Promise<{ values: (string | number | boolean | null)[][] }> {
  const response = await api.get(`/spreadsheets/${spreadsheetId}/range`, {
    params: { startCol, startRow, endCol, endRow },
  });
  return response.data;
}

// Mixed PDF + spreadsheet test with rule evaluation
export interface TestMixedResponse {
  file_results: { fileLabel: string; results: FieldResult[] }[];
  template_rule_results: TemplateRuleResult[];
  computed_values: Record<string, string>;
}

export async function testMixedExtraction(
  files: ControleFile[],
  rules: TemplateRule[] = [],
  computed_fields: ComputedField[] = [],
): Promise<TestMixedResponse> {
  const response = await api.post("/test-mixed", { files, rules, computed_fields });
  return response.data;
}

// Test extraction with current fields (no saved template needed)
export async function testExtraction(
  pdfId: string,
  fields: Field[],
  pdfIdB?: string,
  rules: TemplateRule[] = [],
  computed_fields: ComputedField[] = [],
): Promise<ExtractionResponse> {
  const body: Record<string, unknown> = { pdf_id: pdfId, fields, rules, computed_fields };
  if (pdfIdB) body.pdf_id_b = pdfIdB;
  const response = await api.post("/test", body);
  return response.data;
}

// --- Test Runs ---

export async function saveTestRun(data: {
  pdf_id: string;
  pdf_filename: string;
  template_name?: string;
  template_id?: string;
  entries: { label: string; value: string; status: string }[];
}): Promise<TestRun> {
  const response = await api.post("/test-runs", data);
  return response.data;
}

export async function listTestRuns(): Promise<TestRun[]> {
  const response = await api.get("/test-runs");
  return response.data;
}

export async function getTestRun(runId: string): Promise<TestRun> {
  const response = await api.get(`/test-runs/${runId}`);
  return response.data;
}

export async function deleteTestRun(runId: string): Promise<void> {
  await api.delete(`/test-runs/${runId}`);
}

// --- Cross-template field references ---

export interface TemplateFieldInfo {
  template_id: string;
  template_name: string;
  fields: { label: string; datatype?: string; computed?: boolean; field_type?: string; table_columns?: { id: string; label: string }[] }[];
}

export async function listAllTemplateFields(): Promise<TemplateFieldInfo[]> {
  const response = await api.get("/templates/all-fields");
  return response.data;
}

// --- Controles ---

export async function createControle(
  data: Omit<Controle, "id" | "createdAt" | "updatedAt">,
): Promise<Controle> {
  const response = await api.post("/controles", data);
  return response.data;
}

export async function getControle(id: string): Promise<Controle> {
  const response = await api.get(`/controles/${id}`);
  return response.data;
}

export async function updateControle(
  id: string,
  data: Partial<Controle>,
): Promise<Controle> {
  const response = await api.put(`/controles/${id}`, data);
  return response.data;
}

export async function listControles(): Promise<Controle[]> {
  const response = await api.get("/controles");
  return response.data;
}

export async function deleteControle(id: string): Promise<void> {
  await api.delete(`/controles/${id}`);
}

export async function runControle(
  controleId: string,
  files: Record<string, string[]>,
  filenames?: Record<string, string>,
): Promise<ExtractionResponse[]> {
  const response = await api.post(`/controles/${controleId}/run`, { files, filenames: filenames ?? {} });
  return response.data;
}

export async function listControleRuns(): Promise<ControleRunResult[]> {
  const response = await api.get("/controles/runs/all");
  return response.data;
}

export async function getControleRun(runId: string): Promise<ControleRunResult> {
  const response = await api.get(`/controles/runs/${runId}`);
  return response.data;
}

export async function getControleRunDetails(runId: string): Promise<ExtractionResponse[]> {
  const response = await api.get(`/controles/runs/${runId}/details`);
  return response.data;
}

// --- Klanten ---

export async function createKlant(
  data: { name: string; medewerkerCount?: number; parentId?: string | null },
): Promise<Klant> {
  const response = await api.post("/klanten", data);
  return response.data;
}

export async function listKlanten(): Promise<Klant[]> {
  const response = await api.get("/klanten");
  return response.data;
}

export async function getKlant(id: string): Promise<Klant> {
  const response = await api.get(`/klanten/${id}`);
  return response.data;
}

export async function getKlantChildren(id: string): Promise<Klant[]> {
  const response = await api.get(`/klanten/${id}/children`);
  return response.data;
}

export async function updateKlant(
  id: string,
  data: { name: string; medewerkerCount?: number; parentId?: string | null },
): Promise<Klant> {
  const response = await api.put(`/klanten/${id}`, data);
  return response.data;
}

export async function deleteKlant(id: string): Promise<{ detail: string; deletedKlanten: number }> {
  const response = await api.delete(`/klanten/${id}`);
  return response.data;
}

export async function unlinkControl(klantId: string, controleId: string): Promise<void> {
  await api.post(`/klanten/${klantId}/unlink-control/${controleId}`);
}

// --- Controle Series ---

export async function createControleSeries(
  data: Omit<ControleSeries, "id" | "createdAt" | "updatedAt">,
): Promise<ControleSeries> {
  const response = await api.post("/controle-series", data);
  return response.data;
}

export async function listControleSeries(klantId?: string): Promise<ControleSeries[]> {
  const params = klantId ? { klantId } : {};
  const response = await api.get("/controle-series", { params });
  return response.data;
}

export async function getControleSeries(id: string): Promise<ControleSeries> {
  const response = await api.get(`/controle-series/${id}`);
  return response.data;
}

export async function updateControleSeries(
  id: string,
  data: Omit<ControleSeries, "id" | "createdAt" | "updatedAt">,
): Promise<ControleSeries> {
  const response = await api.put(`/controle-series/${id}`, data);
  return response.data;
}

export async function deleteControleSeries(id: string): Promise<void> {
  await api.delete(`/controle-series/${id}`);
}

export async function runControleSeries(
  seriesId: string,
  files: Record<string, Record<string, string[]>>,
  filenames?: Record<string, string>,
): Promise<ControleSeriesRun> {
  const response = await api.post(`/controle-series/${seriesId}/run`, { files, filenames: filenames ?? {} });
  return response.data;
}

export async function listControleSeriesRuns(): Promise<ControleSeriesRun[]> {
  const response = await api.get("/controle-series/runs/all");
  return response.data;
}

export async function getControleSeriesRun(runId: string): Promise<ControleSeriesRun> {
  const response = await api.get(`/controle-series/runs/${runId}`);
  return response.data;
}

// --- Translation Rules (Signal Lookup) ---

export async function listTranslationRules(): Promise<{ id: string; code: string; rapport: string; teamId: string; teamName: string; translation: string; lastModified: string }[]> {
  const { data } = await api.get("/translation-rules");
  return data;
}

// --- Global Values ---

export async function listGlobalValueGroups(): Promise<GlobalValueGroup[]> {
  const response = await api.get("/global-values");
  return response.data;
}

export async function getGlobalValueGroup(id: string): Promise<GlobalValueGroup> {
  const response = await api.get(`/global-values/${id}`);
  return response.data;
}

export async function createGlobalValueGroup(
  data: { name: string; values: GlobalValueGroup["values"]; mode?: "manual" | "pdf" },
): Promise<GlobalValueGroup> {
  const response = await api.post("/global-values", data);
  return response.data;
}

export async function updateGlobalValueGroup(
  id: string,
  data: { name: string; values: GlobalValueGroup["values"] },
): Promise<GlobalValueGroup> {
  const response = await api.put(`/global-values/${id}`, data);
  return response.data;
}

export async function deleteGlobalValueGroup(id: string): Promise<void> {
  await api.delete(`/global-values/${id}`);
}

export async function uploadGlobalValuePdf(
  groupId: string,
  file: File,
): Promise<{ pdf_id: string; page_count: number; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/global-values/${groupId}/pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getGlobalValueTemplate(
  groupId: string,
): Promise<GlobalValuePdfTemplate> {
  const response = await api.get(`/global-values/${groupId}/template`);
  return response.data;
}

export async function updateGlobalValueTemplate(
  groupId: string,
  data: { fields: Field[] },
): Promise<GlobalValuePdfTemplate> {
  const response = await api.put(`/global-values/${groupId}/template`, data);
  return response.data;
}

export async function extractGlobalValues(
  groupId: string,
): Promise<ExtractionPreview> {
  const response = await api.post(`/global-values/${groupId}/extract`);
  return response.data;
}

export async function confirmGlobalValues(
  groupId: string,
  values: GlobalValue[],
): Promise<GlobalValueGroup> {
  const response = await api.post(`/global-values/${groupId}/confirm`, { values });
  return response.data;
}

export async function getGlobalValueAudit(
  groupId: string,
): Promise<AuditEntry[]> {
  const response = await api.get(`/global-values/${groupId}/audit`);
  return response.data;
}
