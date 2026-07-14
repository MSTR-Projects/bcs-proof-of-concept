import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Play, Trash2, CheckCircle, XCircle, SkipForward, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeaderAction } from "@/context/HeaderActionContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getControleSeries, deleteControleSeries, listControleSeriesRuns } from "@/api/client";
import type { ControleSeries, ControleSeriesRun, SeriesStepResultStatus } from "@/types";

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [series, setSeries] = useState<ControleSeries | null>(null);
  const [runs, setRuns] = useState<ControleSeriesRun[]>([]);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getControleSeries(id).then(setSeries).catch(() => {
      toast({ title: "Serie niet gevonden", variant: "destructive" });
      navigate("/controles");
    });
    listControleSeriesRuns().then((allRuns) => {
      setRuns(allRuns.filter((r) => r.seriesId === id));
    }).catch(() => {});
  }, [id, toast, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteControleSeries(id);
      toast({ title: "Serie verwijderd" });
      navigate("/controles");
    } catch {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const formatTime = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  const conditionLabels = {
    always: "Altijd",
    if_passed: "Als vorige geslaagd",
    if_failed: "Als vorige gefaald",
  };

  const stepStatusIcon = (status: SeriesStepResultStatus) => {
    switch (status) {
      case "passed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped": return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case "error": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (!series) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <HeaderAction>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => navigate(`/controle-series/${id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Bewerken
          </Button>
          <Button
            size="sm"
            className="rounded-full shadow-lg"
            onClick={() => navigate(`/controle-series/${id}/run`)}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Uitvoeren
          </Button>
        </div>
      </HeaderAction>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{series.name}</h1>
        <p className="text-sm text-muted-foreground">
          {series.klantName} · {series.steps.length} stap{series.steps.length !== 1 ? "pen" : ""} · aangemaakt {formatDate(series.createdAt)}
        </p>
      </div>

      {/* Steps overview */}
      <Card>
        <CardHeader>
          <CardTitle>Stappen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {series.steps
            .sort((a, b) => a.order - b.order)
            .map((step, idx) => (
              <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full h-6 w-6 flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-medium flex-1">{step.controleName || "—"}</span>
                <Badge variant="outline" className="text-xs">
                  {conditionLabels[step.condition]}
                </Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Run history */}
      <Card>
        <CardHeader>
          <CardTitle>Uitvoergeschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nog niet uitgevoerd
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-3 rounded-lg border space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/controle-series/${id}/run/${run.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{formatTime(run.runAt)}</span>
                    <Badge
                      variant="outline"
                      className={
                        run.status === "completed"
                          ? "text-success border-success/30 bg-success/10"
                          : "text-warning border-warning/30 bg-warning/10"
                      }
                    >
                      {run.status === "completed" ? "Voltooid" : "Gestopt"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {run.stepResults.map((sr) => (
                      <div key={sr.stepId} className="flex items-center gap-1">
                        {stepStatusIcon(sr.status)}
                        <span className="text-xs text-muted-foreground">{sr.controleName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete */}
      <div className="flex justify-end">
        <Button variant="outline" className="text-destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Reeks verwijderen
        </Button>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reeks verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{series.name}" wilt verwijderen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
