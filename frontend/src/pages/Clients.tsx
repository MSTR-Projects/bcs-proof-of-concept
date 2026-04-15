import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, FileText, ChevronRight, Layers, CheckCircle, AlertTriangle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskContext } from "@/context/TaskContext";
import {
  listKlanten,
  createKlant,
  deleteKlant as deleteKlantApi,
  listControles,
  createControle,
  listControleRuns,
  listControleSeries,
  unlinkControl,
} from "@/api/client";
import type { Klant, Controle, ControleRunResult, ControleSeries } from "@/types";
import { KlantTree } from "@/components/KlantTree";
import { getAncestorPath, buildTree, findNode, collectSubtreeIds } from "@/lib/tree-utils";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const { toast } = useToast();
  const { teams, addKlantToSpecificTeam, removeKlantFromSpecificTeam, getTeamsForKlant } = useTaskContext();

  // Data state
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [allControles, setAllControles] = useState<Controle[]>([]);
  const [allRuns, setAllRuns] = useState<ControleRunResult[]>([]);
  const [allSeries, setAllSeries] = useState<ControleSeries[]>([]);

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(clientId || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newMedewerkerCount, setNewMedewerkerCount] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [klantToDelete, setKlantToDelete] = useState<Klant | null>(null);
  const [addControlOpen, setAddControlOpen] = useState(false);
  const [controlSearch, setControlSearch] = useState("");

  useEffect(() => {
    Promise.all([
      listKlanten(),
      listControles(),
      listControleRuns(),
      listControleSeries(),
    ]).then(([k, c, r, s]) => {
      setKlanten(k);
      setAllControles(c);
      setAllRuns(r);
      setAllSeries(s);
      // Auto-select from URL param or first root
      if (clientId && k.find(kl => kl.id === clientId)) {
        setSelectedId(clientId);
      } else if (!selectedId && k.length > 0) {
        const roots = k.filter(kl => !kl.parentId);
        if (roots.length > 0) setSelectedId(roots[0].id);
      }
    });
  }, []);

  const selected = useMemo(() => klanten.find(k => k.id === selectedId), [klanten, selectedId]);
  const ancestorPath = useMemo(() => selectedId ? getAncestorPath(klanten, selectedId) : [], [klanten, selectedId]);

  // Filtered data for selected klant
  const controles = useMemo(
    () => allControles.filter(c => c.klantId === selectedId),
    [allControles, selectedId]
  );
  const runs = useMemo(
    () => allRuns.filter(r => r.klantId === selectedId),
    [allRuns, selectedId]
  );
  const series = useMemo(
    () => allSeries.filter(s => s.klantId === selectedId),
    [allSeries, selectedId]
  );
  const children = useMemo(
    () => klanten.filter(k => k.parentId === selectedId),
    [klanten, selectedId]
  );

  // Delete info
  const deleteInfo = useMemo(() => {
    if (!klantToDelete) return { descendants: 0, controles: 0 };
    const tree = buildTree(klanten);
    const node = findNode(tree, klantToDelete.id);
    if (!node) return { descendants: 0, controles: 0 };
    const subtreeIds = collectSubtreeIds(node);
    const descendantCount = subtreeIds.length - 1;
    const controleCount = allControles.filter(c => subtreeIds.includes(c.klantId || "")).length;
    return { descendants: descendantCount, controles: controleCount };
  }, [klantToDelete, klanten, allControles]);

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const klant = await createKlant({
        name: newClientName.trim(),
        medewerkerCount: newMedewerkerCount ? parseInt(newMedewerkerCount, 10) : undefined,
        parentId: dialogParentId,
      });
      // Refresh full list to get updated sourceControlIds
      const updated = await listKlanten();
      setKlanten(updated);
      // Also refresh controles since auto-copy may have created new ones
      const updatedControles = await listControles();
      setAllControles(updatedControles);
      setSelectedId(klant.id);
      setNewClientName("");
      setNewMedewerkerCount("");
      setDialogOpen(false);
    } catch {
      toast({ title: "Toevoegen mislukt", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!klantToDelete) return;
    try {
      await deleteKlantApi(klantToDelete.id);
      const updated = await listKlanten();
      setKlanten(updated);
      const updatedControles = await listControles();
      setAllControles(updatedControles);
      if (selectedId === klantToDelete.id) {
        setSelectedId(updated.length > 0 ? updated.find(k => !k.parentId)?.id || null : null);
      }
      setDeleteDialogOpen(false);
      setKlantToDelete(null);
    } catch {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
    }
  };

  const handleUnlink = async (controleId: string) => {
    if (!selectedId) return;
    try {
      await unlinkControl(selectedId, controleId);
      const updated = await listKlanten();
      setKlanten(updated);
      toast({ title: "Controle ontkoppeld" });
    } catch {
      toast({ title: "Ontkoppelen mislukt", variant: "destructive" });
    }
  };

  // Controls available to add (from other clients, not already on this client)
  const availableControles = useMemo(() => {
    if (!selectedId) return [];
    const currentNames = new Set(controles.map(c => c.name));
    return allControles.filter(c => c.klantId !== selectedId && !currentNames.has(c.name));
  }, [allControles, controles, selectedId]);

  const filteredAvailableControles = useMemo(() => {
    if (!controlSearch.trim()) return availableControles;
    const q = controlSearch.toLowerCase();
    return availableControles.filter(
      c => c.name.toLowerCase().includes(q) || (c.klantName || "").toLowerCase().includes(q)
    );
  }, [availableControles, controlSearch]);

  const handleAddExistingControl = async (source: Controle) => {
    if (!selected) return;
    try {
      await createControle({
        name: source.name,
        status: source.status,
        files: source.files,
        rules: source.rules,
        computedFields: source.computedFields,
        ruleGraph: source.ruleGraph,
        klantId: selected.id,
        klantName: selected.name,
      });
      const updatedControles = await listControles();
      setAllControles(updatedControles);
      setAddControlOpen(false);
      setControlSearch("");
      toast({ title: `Controle "${source.name}" toegevoegd` });
    } catch {
      toast({ title: "Toevoegen mislukt", variant: "destructive" });
    }
  };

  const openAddDialog = (parentId: string | null) => {
    setDialogParentId(parentId);
    setNewClientName("");
    setNewMedewerkerCount("");
    setDialogOpen(true);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const formatTime = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Group runs by month
  const runsByMonth = runs.reduce((acc, run) => {
    const date = new Date(run.runAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthLabel = date.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    if (!acc[monthKey]) acc[monthKey] = { label: monthLabel, runs: [] };
    acc[monthKey].runs.push(run);
    return acc;
  }, {} as Record<string, { label: string; runs: ControleRunResult[] }>);

  const getSourceName = (controleId: string) => {
    if (!selected?.sourceControlIds) return null;
    const sourceId = selected.sourceControlIds[controleId];
    if (!sourceId) return null;
    const sourceControle = allControles.find(c => c.id === sourceId);
    if (!sourceControle?.klantId) return null;
    const sourceKlant = klanten.find(k => k.id === sourceControle.klantId);
    return sourceKlant?.name || null;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Tree sidebar */}
      <div className="w-72 border-r bg-muted/30 shrink-0">
        <KlantTree
          klanten={klanten}
          selectedId={selectedId || undefined}
          onSelect={(k) => setSelectedId(k.id)}
          onAddChild={openAddDialog}
        />
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <div className="space-y-6">
            {/* Breadcrumb */}
            {ancestorPath.length > 1 && (
              <div className="text-sm text-muted-foreground">
                {ancestorPath.slice(0, -1).map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && " › "}
                    <button
                      className="hover:text-foreground transition-colors"
                      onClick={() => setSelectedId(a.id)}
                    >
                      {a.name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{selected.name}</h1>
                {selected.medewerkerCount && (
                  <p className="text-sm text-muted-foreground">{selected.medewerkerCount} medewerkers</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setKlantToDelete(selected);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Verwijderen
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setControlSearch(""); setAddControlOpen(true); }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Nieuwe controle
                </Button>
              </div>
            </div>

            {/* Controles */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Controles</CardTitle>
              </CardHeader>
              <CardContent>
                {controles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nog geen controles</p>
                ) : (
                  <div className="space-y-2">
                    {controles.map((c) => {
                      const totalFields = c.files.reduce((sum, f) => sum + f.fields.length, 0);
                      const sourceName = getSourceName(c.id);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                          onClick={() => navigate(`/controle/${c.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{c.name}</span>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>{c.files.length} bestanden</span>
                                <span>{totalFields} velden</span>
                                <span>{formatDate(c.createdAt)}</span>
                              </div>
                              {sourceName && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-xs text-primary">
                                    Overgenomen van {sourceName}
                                  </span>
                                  <button
                                    className="text-xs text-primary underline hover:text-primary/80"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlink(c.id);
                                    }}
                                  >
                                    Ontkoppelen
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.status === "published" ? (
                              <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                                Gepubliceerd
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                                Concept
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sub-klanten */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sub-klanten</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                    onClick={() => openAddDialog(selected.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Geen sub-klanten</p>
                ) : (
                  <div className="space-y-2">
                    {children.map((child) => {
                      const childControles = allControles.filter(c => c.klantId === child.id).length;
                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                          onClick={() => setSelectedId(child.id)}
                        >
                          <div>
                            <span className="font-medium">{child.name}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {childControles} controles
                              {child.medewerkerCount ? ` · ${child.medewerkerCount} medewerkers` : ""}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Controle reeksen */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Controle reeksen</CardTitle>
              </CardHeader>
              <CardContent>
                {series.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nog geen controle reeksen</p>
                ) : (
                  <div className="space-y-2">
                    {series.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                        onClick={() => navigate(`/controle-series/${s.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {s.steps.length} stappen · {formatDate(s.createdAt)}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Control history */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Controlegeschiedenis</CardTitle>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nog geen controles uitgevoerd</p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(runsByMonth).map(([monthKey, { label, runs: monthRuns }]) => (
                      <div key={monthKey}>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 border-b pb-2">
                          {label}
                        </h3>
                        <div className="space-y-2">
                          {monthRuns.map((run) => (
                            <div
                              key={run.id}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border"
                              onClick={() => navigate(`/controle/${run.controleId}/run`)}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground w-32">
                                  {formatTime(run.runAt)}
                                </span>
                                <span className="font-medium">{run.controleName}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {run.status === "success" ? (
                                  <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Alles ok
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {run.failedFields} afwijking{run.failedFields !== 1 ? "en" : ""}
                                  </Badge>
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teams section */}
            {selectedId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {getTeamsForKlant(selectedId).map((team) => (
                      <Badge
                        key={team.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {team.name}
                        <button
                          onClick={() => removeKlantFromSpecificTeam(selectedId, team.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Team
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {teams
                          .filter(t => !t.klantIds.includes(selectedId))
                          .map(t => (
                            <DropdownMenuItem
                              key={t.id}
                              onClick={() => addKlantToSpecificTeam(selectedId, t.id)}
                            >
                              {t.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {getTeamsForKlant(selectedId).length === 0 && (
                    <p className="text-sm text-muted-foreground">Niet toegewezen aan een team.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Selecteer een klant om details te bekijken</p>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogParentId
                ? `Sub-klant toevoegen aan ${klanten.find(k => k.id === dialogParentId)?.name}`
                : "Nieuwe klant toevoegen"}
            </DialogTitle>
            <DialogDescription>
              {dialogParentId
                ? "Deze klant wordt aangemaakt als sub-klant. Controles van de bovenliggende klant worden automatisch overgenomen."
                : "Voeg een nieuwe klant toe op het hoogste niveau."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Klantnaam</Label>
              <Input
                id="client-name"
                placeholder="Bijv. Bakkerij de Gouden Korst"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-medewerkers">Aantal medewerkers</Label>
              <Input
                id="client-medewerkers"
                type="number"
                placeholder="Bijv. 25"
                value={newMedewerkerCount}
                onChange={(e) => setNewMedewerkerCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleAddClient} disabled={!newClientName.trim()}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add existing control dialog */}
      <Dialog open={addControlOpen} onOpenChange={setAddControlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Controle toevoegen aan {selected?.name}</DialogTitle>
            <DialogDescription>
              Selecteer een bestaande controle om toe te voegen.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of klant..."
              value={controlSearch}
              onChange={(e) => setControlSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="max-h-80">
            {filteredAvailableControles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {availableControles.length === 0 ? "Geen beschikbare controles" : "Geen resultaten"}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredAvailableControles.map((c) => {
                  const totalFields = c.files.reduce((sum, f) => sum + f.fields.length, 0);
                  return (
                    <button
                      key={c.id}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left border"
                      onClick={() => handleAddExistingControl(c)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium text-sm">{c.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {c.klantName && <span>{c.klantName}</span>}
                            <span>{c.files.length} bestanden</span>
                            <span>{totalFields} velden</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={c.status === "published" ? "text-success border-success/30 bg-success/10" : "text-warning border-warning/30 bg-warning/10"}>
                        {c.status === "published" ? "Gepubliceerd" : "Concept"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klant verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je &ldquo;{klantToDelete?.name}&rdquo; wilt verwijderen?
              {deleteInfo.descendants > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Dit verwijdert ook {deleteInfo.descendants} sub-klant{deleteInfo.descendants !== 1 ? "en" : ""} en {deleteInfo.controles} controle{deleteInfo.controles !== 1 ? "s" : ""}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
