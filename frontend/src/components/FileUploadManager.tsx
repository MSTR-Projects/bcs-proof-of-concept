import { useState, useCallback, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadPdf, uploadSpreadsheet } from "@/api/client";
import DraggableFileChip from "./DraggableFileChip";
import FileDropSlot from "./FileDropSlot";
import type { UploadedFile } from "@/types";

export interface SlotDefinition {
  key: string;
  label: string;
  group?: string;
  fileType: "pdf" | "spreadsheet";
}

interface FileUploadManagerProps {
  slots: SlotDefinition[];
  onAssignmentsChange: (assignments: Record<string, UploadedFile[]>) => void;
  onPoolChange?: (pool: UploadedFile[]) => void;
}

export default function FileUploadManager({ slots, onAssignmentsChange, onPoolChange }: FileUploadManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pool, setPool] = useState<UploadedFile[]>([]);
  const [assignments, setAssignments] = useState<Record<string, UploadedFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOverZone, setDragOverZone] = useState(false);

  const updateAssignments = useCallback((next: Record<string, UploadedFile[]>) => {
    setAssignments(next);
    onAssignmentsChange(next);
  }, [onAssignmentsChange]);

  const updatePool = useCallback((next: UploadedFile[]) => {
    setPool(next);
    onPoolChange?.(next);
  }, [onPoolChange]);

  // Auto-assign an uploaded file to the first slot whose label matches its
  // filename (e.g. "01_Loonstrook_...pdf" -> slot "Loonstrook").
  const matchSlot = useCallback((file: UploadedFile): SlotDefinition | undefined => {
    const nameTokens = file.filename
      .toLowerCase()
      .replace(/\.(pdf|xlsx)$/, "")
      .split(/[^a-z]+/)
      .filter((t) => t.length >= 4);
    return slots.find((slot) => {
      if (slot.fileType !== file.type) return false;
      const labelTokens = slot.label.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4);
      return labelTokens.some((lt) =>
        nameTokens.some((nt) => nt.startsWith(lt) || lt.startsWith(nt))
      );
    });
  }, [slots]);

  const handleFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    const newPoolFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const { pdf_id } = await uploadPdf(file);
          newPoolFiles.push({ id: pdf_id, filename: file.name, type: "pdf" });
        } else if (
          file.name.toLowerCase().endsWith(".xlsx") ||
          file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          const { spreadsheet_id } = await uploadSpreadsheet(file);
          newPoolFiles.push({ id: spreadsheet_id, filename: file.name, type: "spreadsheet" });
        } else {
          toast({ title: `Ongeldig bestandstype: ${file.name}`, description: "Alleen PDF en XLSX bestanden zijn toegestaan.", variant: "destructive" });
        }
      } catch {
        toast({ title: `Upload mislukt: ${file.name}`, variant: "destructive" });
      }
    }

    if (newPoolFiles.length > 0) {
      const nextPool = [...pool, ...newPoolFiles];
      updatePool(nextPool);

      const nextAssignments = { ...assignments };
      for (const f of newPoolFiles) {
        const slot = matchSlot(f);
        if (!slot) continue;
        const current = nextAssignments[slot.key] ?? [];
        if (current.some((x) => x.id === f.id)) continue;
        nextAssignments[slot.key] = [...current, f];
      }
      updateAssignments(nextAssignments);
    }
    setUploading(false);
  }, [pool, toast, updatePool, assignments, matchSlot, updateAssignments]);

  const handleDropZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeFromPool = useCallback((fileId: string) => {
    const nextPool = pool.filter((f) => f.id !== fileId);
    updatePool(nextPool);
    const nextAssignments = { ...assignments };
    for (const key in nextAssignments) {
      nextAssignments[key] = nextAssignments[key].filter((f) => f.id !== fileId);
    }
    updateAssignments(nextAssignments);
  }, [pool, assignments, updatePool, updateAssignments]);

  const handleSlotDrop = useCallback((slotKey: string, file: UploadedFile) => {
    const current = assignments[slotKey] ?? [];
    if (current.some((f) => f.id === file.id)) return;
    const next = { ...assignments, [slotKey]: [...current, file] };
    updateAssignments(next);
  }, [assignments, updateAssignments]);

  const handleSlotRemove = useCallback((slotKey: string, fileId: string) => {
    const current = assignments[slotKey] ?? [];
    const next = { ...assignments, [slotKey]: current.filter((f) => f.id !== fileId) };
    updateAssignments(next);
  }, [assignments, updateAssignments]);

  const assignedIds = new Set(
    Object.values(assignments).flat().map((f) => f.id)
  );

  // Group slots by group (for series)
  const groups = new Map<string | undefined, SlotDefinition[]>();
  for (const slot of slots) {
    const key = slot.group;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(slot);
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Bestanden uploaden</h2>
          <p className="text-sm text-muted-foreground">
            Upload PDF en XLSX bestanden. {pool.length} bestand{pool.length !== 1 ? "en" : ""} in pool.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverZone(true); }}
          onDragLeave={() => setDragOverZone(false)}
          onDrop={handleDropZone}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOverZone ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Bestanden uploaden...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Sleep bestanden hierheen of{" "}
                <button
                  className="text-primary underline underline-offset-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  blader
                </button>
              </p>
              <p className="text-xs text-muted-foreground">PDF, XLSX</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Pool chips */}
        {pool.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...pool]
              .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
              .map((f) => (
                <DraggableFileChip
                  key={f.id}
                  file={f}
                  assigned={assignedIds.has(f.id)}
                  onRemove={() => removeFromPool(f.id)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Assignment slots */}
      {pool.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Bestanden toewijzen</h2>
            <p className="text-sm text-muted-foreground">
              Sleep bestanden uit de pool naar de juiste slots.
            </p>
          </div>

          {Array.from(groups.entries()).map(([group, groupSlots]) => (
            <div key={group ?? "__default"} className="space-y-2">
              {group && (
                <h3 className="text-sm font-semibold text-muted-foreground mt-4">{group}</h3>
              )}
              {groupSlots.map((slot) => (
                <FileDropSlot
                  key={slot.key}
                  label={slot.label}
                  fileType={slot.fileType}
                  assignedFiles={assignments[slot.key] ?? []}
                  onFileDrop={(file) => handleSlotDrop(slot.key, file)}
                  onFileRemove={(fileId) => handleSlotRemove(slot.key, fileId)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
