import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, CheckCircle, AlertTriangle, Clock, TrendingUp, ArrowRight, Sparkles, FileCheck, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTaskContext } from "@/context/TaskContext";
import { listControleRuns } from "@/api/client";
import type { ControleRunResult } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useTaskContext();
  const [runs, setRuns] = useState<ControleRunResult[]>([]);

  useEffect(() => {
    listControleRuns().then(setRuns).catch(() => {});
  }, []);

  // Stats derived from real runs
  const controlesThisMonth = runs.length;
  const bevindingen = runs.reduce((sum, r) => sum + r.failedFields, 0);

  // Recent controls (top 5, newest first)
  const recentControls = [...runs]
    .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())
    .slice(0, 5);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: ControleRunResult["status"]) => {
    if (status === 'success') {
      return (
        <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
          <CheckCircle className="h-3 w-3" />
          Geslaagd
        </Badge>
      );
    }
    if (status === 'review') {
      return (
        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Review nodig
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1">
        <Clock className="h-3 w-3" />
        Mislukt
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent to-primary/5 p-8 border border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Welkom terug, {currentUser}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Controle assistent
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Beheer en automatiseer al je controles op één plek. Upload rapporten, pas regels toe,
            en ontvang direct terugkoppeling.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
              <Link to="/controle/nieuw">
                <Plus className="mr-2 h-5 w-5" />
                Nieuwe controle
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/klanten">
                Bekijk klanten
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Controles uitgevoerd</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{controlesThisMonth}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Geslaagd</CardTitle>
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{runs.filter(r => r.status === "success").length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bevindingen</CardTitle>
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{bevindingen}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Controls Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Recente controles</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/controles" className="text-muted-foreground hover:text-foreground">
              Alles zien
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Controle</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Velden</TableHead>
                <TableHead>Regels</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentControls.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/controles/runs/${run.id}`)}
                >
                  <TableCell className="font-medium">{run.controleName}</TableCell>
                  <TableCell className="text-muted-foreground">{run.klantName || "—"}</TableCell>
                  <TableCell>{getStatusBadge(run.status)}</TableCell>
                  <TableCell>
                    <span className={run.failedFields > 0 ? "text-destructive" : "text-success"}>
                      {run.passedFields}/{run.totalFields} OK
                    </span>
                  </TableCell>
                  <TableCell>
                    {run.rulesTotal > 0 ? (
                      <span className={run.rulesPassed < run.rulesTotal ? "text-warning" : "text-success"}>
                        {run.rulesPassed}/{run.rulesTotal}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(run.runAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/controle/${run.controleId}/run`);
                      }}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Opnieuw
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recentControls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-muted-foreground">Nog geen resultaten</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
