import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle, AlertTriangle, Clock, ListChecks, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listControleRuns } from "@/api/client";
import type { ControleRunResult } from "@/types";

export default function MyControlResults() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [runs, setRuns] = useState<ControleRunResult[]>([]);

  useEffect(() => {
    listControleRuns().then(setRuns).catch(() => {});
  }, []);

  const filteredRuns = runs.filter(run =>
    run.controleName.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getRunStatusBadge = (status: ControleRunResult["status"]) => {
    if (status === "success") {
      return (
        <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
          <CheckCircle className="h-3 w-3" />
          Geslaagd
        </Badge>
      );
    }
    if (status === "review") {
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
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam, klant of controleur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
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
              {filteredRuns.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/controles/runs/${run.id}`)}
                >
                  <TableCell className="font-medium">{run.controleName}</TableCell>
                  <TableCell className="text-muted-foreground">{run.klantName || "—"}</TableCell>
                  <TableCell>{getRunStatusBadge(run.status)}</TableCell>
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
              {filteredRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <ListChecks className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
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
