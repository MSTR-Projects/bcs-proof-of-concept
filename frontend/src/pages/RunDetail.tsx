import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderAction } from "@/context/HeaderActionContext";
import { getControle, getControleRun, getControleRunDetails } from "@/api/client";
import RunResultViewer from "@/components/RunResultViewer";
import { buildRunDetailView, type RunDetailView } from "@/lib/runDetailView";
import type { Controle, ControleRunResult } from "@/types";

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<ControleRunResult | null>(null);
  const [view, setView] = useState<RunDetailView | null>(null);

  useEffect(() => {
    if (!runId) return;

    const load = async () => {
      try {
        const runResult = await getControleRun(runId);
        setRun(runResult);

        const details = await getControleRunDetails(runId);

        let controle: Controle | null = null;
        try {
          controle = await getControle(runResult.controleId);
        } catch { /* continue without labels */ }

        setView(buildRunDetailView(details, controle));
      } catch {
        setError("Kon resultaten van deze uitvoering niet laden.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Laden...
      </div>
    );
  }

  if (error || !run || !view) {
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

  const runDate = new Date(run.runAt).toLocaleString("nl-NL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <HeaderAction>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Terug
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            size="sm"
            onClick={() => navigate(`/controle/${run.controleId}/run`)}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Opnieuw uitvoeren
          </Button>
        </div>
      </HeaderAction>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{run.controleName}</h1>
        <p className="text-muted-foreground text-sm">
          {run.klantName ? `${run.klantName} · ` : ""}uitgevoerd op {runDate}
        </p>
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
