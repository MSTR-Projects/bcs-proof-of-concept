import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderAction } from "@/context/HeaderActionContext";
import { getControleRunDetails, getControleSeriesRun, getControle } from "@/api/client";
import RunResultViewer from "@/components/RunResultViewer";
import { buildRunDetailView, type RunDetailView } from "@/lib/runDetailView";
import type { ExtractionResponse, Controle } from "@/types";

export default function RunSeriesStepDetail() {
  const { seriesId, runId, stepId } = useParams<{ seriesId: string; runId: string; stepId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepName, setStepName] = useState("");
  const [view, setView] = useState<RunDetailView | null>(null);

  useEffect(() => {
    if (!runId || !stepId) return;

    const load = async () => {
      try {
        const seriesRun = await getControleSeriesRun(runId);
        const stepResult = seriesRun.stepResults.find((sr) => sr.stepId === stepId);
        if (!stepResult?.controleRunId) {
          setError("Stap niet gevonden of geen resultaten beschikbaar.");
          setLoading(false);
          return;
        }

        setStepName(stepResult.controleName);

        const details: ExtractionResponse[] = await getControleRunDetails(stepResult.controleRunId);

        let controle: Controle | null = null;
        try {
          controle = await getControle(stepResult.controleId);
        } catch { /* continue without labels */ }

        setView(buildRunDetailView(details, controle));
      } catch {
        setError("Kon resultaten niet laden.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [runId, stepId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Laden...
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center space-y-4">
        <p className="text-muted-foreground">{error ?? "Resultaten niet gevonden."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeaderAction>
        <Button
          variant="outline"
          className="rounded-full"
          size="sm"
          onClick={() => navigate(`/controle-series/${seriesId}/run/${runId}`)}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Terug naar serie
        </Button>
      </HeaderAction>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{stepName}</h1>
        <p className="text-muted-foreground text-sm">Stapresultaten</p>
      </div>

      <RunResultViewer
        fileGroups={view.fileGroups}
        ruleResults={view.ruleResults}
        computedValues={view.computedValues}
        summary={view.summary}
      />
    </div>
  );
}
