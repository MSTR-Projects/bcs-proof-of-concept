import { useState, useEffect } from "react";
import { UserPlus, Trash2, Search, Link2Off, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTaskContext } from "@/context/TaskContext";
import { useToast } from "@/hooks/use-toast";
import { listKlanten } from "@/api/client";
import type { Klant } from "@/types";

export default function TeamPage() {
  const {
    currentTeam,
    addTeamMember,
    removeTeamMember,
    addKlantToTeam,
    removeKlantFromTeam,
  } = useTaskContext();
  const { toast } = useToast();

  // Leden state
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Klanten state
  const [allKlanten, setAllKlanten] = useState<Klant[]>([]);
  const [addKlantOpen, setAddKlantOpen] = useState(false);
  const [klantSearch, setKlantSearch] = useState("");
  const [klantToRemove, setKlantToRemove] = useState<string | null>(null);

  useEffect(() => {
    listKlanten().then(setAllKlanten).catch(() => {});
  }, []);

  if (!currentTeam) return null;

  // Leden handlers
  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (currentTeam.members.some(m => m.email === email)) {
      toast({ title: "Dit e-mailadres is al toegevoegd", variant: "destructive" });
      return;
    }
    addTeamMember(email);
    setInviteEmail("");
    toast({ title: "Uitnodiging verstuurd", description: `${email} is uitgenodigd.` });
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeTeamMember(memberToRemove);
      setMemberToRemove(null);
      toast({ title: "Lid verwijderd" });
    }
  };

  // Klanten handlers
  const assignedKlanten = allKlanten.filter(k => currentTeam.klantIds.includes(k.id));
  const unassignedKlanten = allKlanten
    .filter(k => !currentTeam.klantIds.includes(k.id))
    .filter(k => k.name.toLowerCase().includes(klantSearch.toLowerCase()));

  const handleAddKlant = (klantId: string) => {
    addKlantToTeam(klantId);
    toast({ title: "Klant toegevoegd" });
  };

  const confirmRemoveKlant = () => {
    if (klantToRemove) {
      removeKlantFromTeam(klantToRemove);
      setKlantToRemove(null);
      toast({ title: "Klant ontkoppeld" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{currentTeam.name}</h1>
        <p className="text-muted-foreground">Beheer teamleden en klanten</p>
      </div>

      <Tabs defaultValue="leden">
        <TabsList>
          <TabsTrigger value="leden">Leden</TabsTrigger>
          <TabsTrigger value="klanten">Klanten</TabsTrigger>
        </TabsList>

        {/* ===== LEDEN TAB ===== */}
        <TabsContent value="leden" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lid uitnodigen</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); handleInvite(); }}
                className="flex gap-2"
              >
                <Input
                  type="email"
                  placeholder="E-mailadres"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="max-w-sm"
                />
                <Button type="submit" disabled={!inviteEmail.trim()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Uitnodigen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Leden ({currentTeam.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Toegevoegd op</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTeam.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.status === "active" ? "default" : "secondary"}
                          className={
                            member.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {member.status === "active" ? "Actief" : "Uitgenodigd"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.addedAt}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMemberToRemove(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== KLANTEN TAB ===== */}
        <TabsContent value="klanten" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Toegewezen klanten ({assignedKlanten.length})
              </CardTitle>
              <Button onClick={() => { setAddKlantOpen(true); setKlantSearch(""); }}>
                <Plus className="h-4 w-4 mr-2" />
                Klant toevoegen
              </Button>
            </CardHeader>
            <CardContent>
              {assignedKlanten.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nog geen klanten toegewezen aan dit team.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Medewerkers</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedKlanten.map((klant) => (
                      <TableRow key={klant.id}>
                        <TableCell className="font-medium">{klant.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {klant.medewerkerCount ?? "–"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setKlantToRemove(klant.id)}
                            title="Ontkoppelen"
                          >
                            <Link2Off className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      {/* Remove member confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lid verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit lid wordt verwijderd uit het team. Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove klant confirmation */}
      <AlertDialog open={!!klantToRemove} onOpenChange={() => setKlantToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klant ontkoppelen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze klant wordt ontkoppeld van het team. De klant zelf wordt niet verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveKlant}>
              Ontkoppelen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add klant dialog */}
      <Dialog open={addKlantOpen} onOpenChange={setAddKlantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant toevoegen aan team</DialogTitle>
            <DialogDescription>
              Selecteer een klant om toe te wijzen aan {currentTeam.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek klant..."
                value={klantSearch}
                onChange={(e) => setKlantSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {unassignedKlanten.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Geen klanten gevonden.
                </p>
              ) : (
                unassignedKlanten.map((klant) => (
                  <button
                    key={klant.id}
                    onClick={() => {
                      handleAddKlant(klant.id);
                      setAddKlantOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors"
                  >
                    {klant.name}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddKlantOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
