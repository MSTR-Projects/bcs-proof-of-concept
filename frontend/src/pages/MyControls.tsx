import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Play, FileText, MoreHorizontal, Eye, Trash2, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderAction } from "@/context/HeaderActionContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { listControles, deleteControle } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import type { Controle } from "@/types";

export default function MyControls() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"alle" | "mijn">("alle");
  const [controles, setControles] = useState<Controle[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Controle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    listControles().then(setControles).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteControle(deleteTarget.id);
      setControles((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: "Controle verwijderd" });
    } catch {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredControles = controles.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "alle" || c.createdBy === user?.email;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <HeaderAction>
        <Button onClick={() => { setNewName(""); setShowNewDialog(true); }} className="rounded-full shadow-lg" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe controle
        </Button>
      </HeaderAction>

      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "alle" | "mijn")}>
          <TabsList>
            <TabsTrigger value="alle">Alle controles</TabsTrigger>
            <TabsTrigger value="mijn">Mijn controles</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, klant of controleur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Bestanden</TableHead>
                <TableHead>Velden</TableHead>
                <TableHead>Regels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredControles.map((c) => {
                const totalFields = c.files.reduce((sum, f) => sum + f.fields.length, 0);
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/controle/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{c.files.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{totalFields}</TableCell>
                    <TableCell className="text-muted-foreground">{c.rules.length}</TableCell>
                    <TableCell>
                      {c.status === "published" ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                          Gepubliceerd
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                          Concept
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/controle/${c.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Bekijken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/controle/${c.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          {c.status === "published" && (
                            <DropdownMenuItem onClick={() => navigate(`/controle/${c.id}/run`)}>
                              <Play className="h-4 w-4 mr-2" />
                              Uitvoeren
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredControles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <ListChecks className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nog geen controles aangemaakt</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => { setNewName(""); setShowNewDialog(true); }}
                    >
                      Maak je eerste controle
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New controle name dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe controle</DialogTitle>
            <DialogDescription>
              Geef een naam op voor de nieuwe controle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="controle-name">Naam</Label>
              <Input
                id="controle-name"
                placeholder="Bijv. Jaarrekening controle 2025"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Annuleren
            </Button>
            <Button
              disabled={!newName.trim()}
              onClick={() => {
                const params = new URLSearchParams({ naam: newName.trim() });
                setShowNewDialog(false);
                navigate(`/controle/nieuw?${params.toString()}`);
              }}
            >
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Controle verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deleteTarget?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
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
