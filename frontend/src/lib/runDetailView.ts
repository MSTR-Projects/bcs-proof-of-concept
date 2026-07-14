import type { Controle, ExtractionResponse, FileGroup, TemplateRuleResult } from "@/types";

export interface RunDetailView {
  fileGroups: FileGroup[];
  ruleResults: TemplateRuleResult[];
  computedValues: Record<string, string>;
  summary: { fieldsOk: number; failures: number; rulesPassed: number; rulesTotal: number };
}

function guessFileType(filename?: string): "pdf" | "spreadsheet" {
  if (!filename) return "pdf";
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "xlsx" || ext === "xls" || ext === "csv" ? "spreadsheet" : "pdf";
}

/** Group stored extraction responses per file definition for RunResultViewer. */
export function buildRunDetailView(details: ExtractionResponse[], controle: Controle | null): RunDetailView {
  const allRules = details.flatMap((r) => r.template_rule_results);
  const allComputed = details.reduce((acc, r) => ({ ...acc, ...r.computed_values }), {} as Record<string, string>);

  const groups: FileGroup[] = [];
  if (controle) {
    // Assign details to file defs: first try field-label matching, then sequential
    const usedDetailIndices = new Set<number>();
    for (const fileDef of controle.files) {
      const fileDefDetails: ExtractionResponse[] = [];
      const fileDefFieldLabels = new Set(fileDef.fields.map((f) => f.label));
      for (let i = 0; i < details.length; i++) {
        if (usedDetailIndices.has(i)) continue;
        const detailFieldLabels = new Set(details[i].results.map((r) => r.label));
        const hasOverlap = [...fileDefFieldLabels].some((l) => detailFieldLabels.has(l));
        if (hasOverlap) {
          fileDefDetails.push(details[i]);
          usedDetailIndices.add(i);
        }
      }
      // If no match by labels, take the next unassigned detail
      if (fileDefDetails.length === 0) {
        for (let i = 0; i < details.length; i++) {
          if (!usedDetailIndices.has(i)) {
            fileDefDetails.push(details[i]);
            usedDetailIndices.add(i);
            break;
          }
        }
      }
      if (fileDefDetails.length > 0) {
        groups.push({
          label: fileDef.label,
          files: fileDefDetails.map((fr) => {
            const passed = fr.results.filter((r) => r.status === "ok").length;
            return {
              fileId: fr.pdf_id,
              filename: fr.source_filename || "Bestand",
              fileType: fileDef.fileType,
              results: fr.results,
              ruleResults: fr.template_rule_results,
              computedValues: fr.computed_values,
              passed,
              total: fr.results.length,
            };
          }),
        });
      }
    }
  }

  if (groups.length === 0) {
    groups.push({
      label: "Bestanden",
      files: details.map((fr) => {
        const passed = fr.results.filter((r) => r.status === "ok").length;
        return {
          fileId: fr.pdf_id,
          filename: fr.source_filename || "Bestand",
          fileType: guessFileType(fr.source_filename),
          results: fr.results,
          ruleResults: fr.template_rule_results,
          computedValues: fr.computed_values,
          passed,
          total: fr.results.length,
        };
      }),
    });
  }

  const totalFields = details.reduce((s, r) => s + r.results.length, 0);
  const totalPassed = details.reduce((s, r) => s + r.results.filter((f) => f.status === "ok").length, 0);
  const rulesPassed = allRules.filter((r) => r.passed).length;

  return {
    fileGroups: groups,
    ruleResults: allRules,
    computedValues: allComputed,
    summary: {
      fieldsOk: totalPassed,
      failures: totalFields - totalPassed,
      rulesPassed,
      rulesTotal: allRules.length,
    },
  };
}
