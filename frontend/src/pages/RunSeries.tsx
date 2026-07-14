import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Loader2, CheckCircle, XCircle, SkipForward,
  AlertTriangle, RotateCcw, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeaderAction } from "@/context/HeaderActionContext";
import { useToast } from "@/hooks/use-toast";
import {
  getControleSeries,
  getControle,
  getControleSeriesRun,
  runControleSeries,
} from "@/api/client";
import FileUploadManager from "@/components/FileUploadManager";
import type { SlotDefinition } from "@/components/FileUploadManager";
import type {
  ControleSeries,
  Controle,
  ControleSeriesRun,
  SeriesStepResultStatus,
  UploadedFile,
} from "@/types";

type Phase = "upload" | "running" | "results" | "loading";

interface StepInfo {
  stepId: string;
  order: number;
  controleId: string;
  controleName: string;
  condition: string;
  controle: Controle | null;
}

export default function RunSeries() {
  const { id, runId } = useParams<{ id: string; runId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [series, setSeries] = useState<ControleSeries | null>(null);
  const [stepInfos, setStepInfos] = useState<StepInfo[]>([]);
  const [phase, setPhase] = useState<Phase>(runId ? "loading" : "upload");
  const [assignments, setAssignments] = useState<Record<string, UploadedFile[]>>({});
  const [pool, setPool] = useState<UploadedFile[]>([]);
  const [result, setResult] = useState<ControleSeriesRun | null>(null);

  useEffect(() => {
    if (!id) return;
    getControleSeries(id).then(async (s) => {
      setSeries(s);
      const sorted = [...s.steps].sort((a, b) => a.order - b.order);
      const infos: StepInfo[] = [];
      for (const step of sorted) {
        let controle: Controle | null = null;
        try {
          controle = await getControle(step.controleId);
        } catch { /* skip */ }
        infos.push({
          stepId: step.id,
          order: step.order,
          controleId: step.controleId,
          controleName: step.controleName,
          condition: step.condition,
          controle,
        });
      }
      setStepInfos(infos);
    }).catch(() => {
      toast({ title: "Serie niet gevonden", variant: "destructive" });
      navigate("/controles");
    });
  }, [id, toast, navigate]);

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

  const slots: SlotDefinition[] = [];
  const conditionLabels: Record<string, string> = {
    always: "Altijd",
    if_passed: "Als vorige geslaagd",
    if_failed: "Als vorige gefaald",
  };

  for (const info of stepInfos) {
    if (!info.controle) continue;
    const condLabel = info.order > 1 ? ` [${conditionLabels[info.condition] ?? info.condition}]` : "";
    const group = `Stap ${info.order}: ${info.controleName}${condLabel}`;
    for (const fileDef of info.controle.files) {
      slots.push({
        key: `${info.stepId}_${fileDef.id}`,
        label: fileDef.label,
        group,
        fileType: fileDef.fileType,
      });
    }
  }

  const allSlotsAssigned = slots.every((slot) => {
    const assigned = assignments[slot.key];
    return assigned && assigned.length > 0;
  });

  const handleRun = useCallback(async () => {
    if (!series || !allSlotsAssigned) return;
    setPhase("running");
    try {
      const files: Record<string, Record<string, string[]>> = {};
      const filenames: Record<string, string> = {};
      for (const info of stepInfos) {
        if (!info.controle) continue;
        const stepFiles: Record<string, string[]> = {};
        for (const fileDef of info.controle.files) {
          const assigned = assignments[`${info.stepId}_${fileDef.id}`] ?? [];
          stepFiles[fileDef.id] = assigned.map((f) => f.id);
          for (const f of assigned) {
            filenames[f.id] = f.filename;
          }
        }
        files[info.stepId] = stepFiles;
      }
      const res = await runControleSeries(series.id, files, filenames);
      setResult(res);
      setPhase("results");
      navigate(`/controle-series/${series.id}/run/${res.id}`, { replace: true });
    } catch {
      toast({ title: "Uitvoeren mislukt", variant: "destructive" });
      setPhase("upload");
    }
  }, [series, stepInfos, assignments, allSlotsAssigned, toast, navigate]);

  const stepStatusIcon = (status: SeriesStepResultStatus) => {
    switch (status) {
      case "passed": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed": return <XCircle className="h-5 w-5 text-red-500" />;
      case "skipped": return <SkipForward className="h-5 w-5 text-muted-foreground" />;
      case "error": return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  if (!series) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <HeaderAction>
        {phase === "results" && (
          <Button
            variant="outline"
            className="rounded-full"
            size="sm"
            onClick={() => {
              setPhase("upload");
              setResult(null);
              setAssignments({});
              setPool([]);
              navigate(`/controle-series/${id}/run`, { replace: true });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Opnieuw uitvoeren
          </Button>
        )}
      </HeaderAction>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{series.name}</h1>
        <p className="text-sm text-muted-foreground">
          {series.klantName} · {series.steps.length} stap{series.steps.length !== 1 ? "pen" : ""}
        </p>
      </div>

      {phase === "upload" && (
        <div className="space-y-6">
          <FileUploadManager
            slots={slots}
            onAssignmentsChange={setAssignments}
            onPoolChange={setPool}
          />

          <Button size="lg" className="w-full" disabled={!allSlotsAssigned} onClick={handleRun}>
            <Play className="h-4 w-4 mr-2" />
            Serie uitvoeren
          </Button>
        </div>
      )}

      {phase === "loading" && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-lg font-semibold">Resultaten laden...</h2>
        </div>
      )}

      {phase === "running" && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-lg font-semibold">Serie wordt uitgevoerd...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stappen worden sequentieel verwerkt.
          </p>
        </div>
      )}

      {phase === "results" && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                result.status === "completed"
                  ? "text-success border-success/30 bg-success/10"
                  : "text-warning border-warning/30 bg-warning/10"
              }
            >
              {result.status === "completed" ? "Voltooid" : "Gestopt"}
            </Badge>
          </div>

          {result.stepResults.map((sr, idx) => {
            const isClickable = sr.status === "passed" || sr.status === "failed";
            return (
              <Card
                key={sr.stepId}
                className={isClickable ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}
                onClick={isClickable ? () => navigate(`/controle-series/${id}/run/${result.id}/step/${sr.stepId}`) : undefined}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full h-6 w-6 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {stepStatusIcon(sr.status)}
                  <span className="font-medium flex-1">{sr.controleName}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      sr.status === "passed" ? "text-success border-success/30 bg-success/10"
                      : sr.status === "failed" ? "text-destructive border-destructive/30 bg-destructive/10"
                      : sr.status === "skipped" ? "text-muted-foreground"
                      : "text-destructive border-destructive/30 bg-destructive/10"
                    }`}
                  >
                    {sr.status === "passed" ? "Geslaagd" : sr.status === "failed" ? "Gefaald" : sr.status === "skipped" ? "Overgeslagen" : "Fout"}
                  </Badge>
                  {isClickable && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
