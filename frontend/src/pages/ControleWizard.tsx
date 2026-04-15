import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { WizardTabs } from "@/components/wizard/WizardTabs";
import { WizardBestandenTab } from "@/components/wizard/WizardBestandenTab";
import { WizardRegelsTab } from "@/components/wizard/WizardRegelsTab";
import { createControle, updateControle, getControle } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { HeaderAction } from "@/context/HeaderActionContext";
import { Button } from "@/components/ui/button";
import { Save, Rocket, Loader2 } from "lucide-react";
import type { WizardTab, ControleFile } from "@/types";

function canAccessRegels(files: ControleFile[]): boolean {
  return files.length > 0 && files.every((f) => {
    if (f.fileType === "spreadsheet") return true;
    return f.extractionResults !== null && f.extractionResults.length > 0;
  });
}

export default function ControleWizard() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const wizardControle = useAppStore((s) => s.wizardControle);
  const wizardActiveTab = useAppStore((s) => s.wizardActiveTab);
  const initWizard = useAppStore((s) => s.initWizard);
  const setWizardTab = useAppStore((s) => s.setWizardTab);
  const addWizardFile = useAppStore((s) => s.addWizardFile);
  const removeWizardFile = useAppStore((s) => s.removeWizardFile);
  const updateWizardFileLabel = useAppStore((s) => s.updateWizardFileLabel);
  const saveCurrentFileToWizard = useAppStore((s) => s.saveCurrentFileToWizard);
  const saveRulesToWizard = useAppStore((s) => s.saveRulesToWizard);
  const clearWizard = useAppStore((s) => s.clearWizard);
  const finalizeWizard = useAppStore((s) => s.finalizeWizard);
  const wizardActiveFileId = useAppStore((s) => s.wizardActiveFileId);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Track which file is open inside the Bestanden tab
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getControle(id)
        .then((controle) => initWizard(controle))
        .catch(() => {
          toast({ title: "Controle niet gevonden", variant: "destructive" });
          navigate("/controles");
        });
    } else {
      const nameFromParams = searchParams.get("naam") ?? "";
      const klantId = searchParams.get("klantId") ?? undefined;
      const klantName = searchParams.get("klantName") ?? undefined;
      initWizard(undefined, nameFromParams, klantId, klantName);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushCurrentContext = useCallback(() => {
    if (!wizardControle) return;
    if (viewingFileId) saveCurrentFileToWizard();
    if (wizardActiveTab === "regels") saveRulesToWizard();
  }, [wizardControle, viewingFileId, wizardActiveTab, saveCurrentFileToWizard, saveRulesToWizard]);

  const handleTabChange = useCallback(
    (tab: WizardTab) => {
      if (tab === "regels" && wizardControle && !canAccessRegels(wizardControle.files)) {
        toast({ title: "Voer eerst een preview-extractie uit voor alle bestanden", variant: "destructive" });
        return;
      }
      flushCurrentContext();
      setViewingFileId(null);
      setWizardTab(tab);
    },
    [flushCurrentContext, setWizardTab, wizardControle, toast],
  );

  const handleOpenFile = useCallback((fileId: string) => {
    setViewingFileId(fileId);
  }, []);

  const handleCloseFile = useCallback(() => {
    saveCurrentFileToWizard();
    setViewingFileId(null);
  }, [saveCurrentFileToWizard]);

  const handleSaveDraft = useCallback(async () => {
    flushCurrentContext();
    const controle = finalizeWizard();
    if (!controle) return;
    setSaving(true);
    try {
      if (id) {
        await updateControle(id, { ...controle, status: "draft" });
      } else {
        await createControle({ ...controle, status: "draft", createdBy: user?.email });
      }
      toast({ title: "Concept opgeslagen" });
      clearWizard();
      navigate("/controles");
    } catch {
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [flushCurrentContext, finalizeWizard, id, toast, clearWizard, navigate]);

  const handlePublish = useCallback(async () => {
    flushCurrentContext();
    const controle = finalizeWizard();
    if (!controle) return;
    setPublishing(true);
    try {
      if (id) {
        await updateControle(id, { ...controle, status: "published" });
      } else {
        await createControle({ ...controle, status: "published", createdBy: user?.email });
      }
      toast({ title: "Controle gepubliceerd" });
      clearWizard();
      navigate("/controles");
    } catch {
      toast({ title: "Publiceren mislukt", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }, [flushCurrentContext, finalizeWizard, id, toast, clearWizard, navigate]);

  if (!wizardControle) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Laden...
      </div>
    );
  }

  const isBusy = saving || publishing;

  return (
    <div className="flex flex-col h-full -mx-6 -mt-2">
      <HeaderAction>
        <Button variant="outline" className="rounded-full" size="sm" onClick={handleSaveDraft} disabled={isBusy}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Opslaan als concept
        </Button>
        <Button className="rounded-full shadow-lg" size="sm" onClick={handlePublish} disabled={isBusy}>
          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Rocket className="h-3.5 w-3.5 mr-1.5" />}
          Publiceren
        </Button>
      </HeaderAction>

      <WizardTabs
        activeTab={wizardActiveTab}
        controleName={wizardControle.name}
        files={wizardControle.files}
        onTabChange={handleTabChange}
        isViewingFile={!!viewingFileId}
      />

      <div className="flex-1 min-h-0">
        {wizardActiveTab === "bestanden" && (
          <WizardBestandenTab
            files={wizardControle.files}
            onAddFile={addWizardFile}
            onRemoveFile={removeWizardFile}
            onUpdateLabel={updateWizardFileLabel}
            onNext={() => handleTabChange("regels")}
            activeFileId={viewingFileId}
            onOpenFile={handleOpenFile}
            onCloseFile={handleCloseFile}
          />
        )}

        {wizardActiveTab === "regels" && (
          <WizardRegelsTab controle={wizardControle} />
        )}
      </div>
    </div>
  );
}
