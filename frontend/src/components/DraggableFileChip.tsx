import { FileText, FileSpreadsheet, X, GripVertical, Check } from "lucide-react";
import type { UploadedFile } from "@/types";

interface DraggableFileChipProps {
  file: UploadedFile;
  onRemove?: () => void;
  showGrip?: boolean;
  assigned?: boolean;
}

export default function DraggableFileChip({ file, onRemove, showGrip = true, assigned = false }: DraggableFileChipProps) {
  const Icon = file.type === "pdf" ? FileText : FileSpreadsheet;
  const colorClass = file.type === "pdf"
    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(file));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing select-none ${colorClass} ${assigned ? "opacity-40" : ""}`}
    >
      {showGrip && <GripVertical className="h-3 w-3 opacity-40" />}
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[160px]">{file.filename}</span>
      {assigned && <Check className="h-3 w-3 shrink-0" />}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
