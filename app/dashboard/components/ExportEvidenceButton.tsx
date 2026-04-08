import { Download, FileJson } from "lucide-react";
import { MissionActionButton } from "@/app/components/ui/MissionActionButton";

type ExportEvidenceButtonProps = {
  onExport: () => void;
};

export function ExportEvidenceButton({ onExport }: ExportEvidenceButtonProps) {
  return (
    <MissionActionButton
      onClick={onExport}
      title="Export Evidence"
      subtitle="JSON Package"
      className="hover:border-amber-500/50 hover:bg-amber-900/20 hover:text-amber-400"
      leftIcon={
        <FileJson className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-amber-500" />
      }
      rightIcon={
        <Download className="h-2.5 w-2.5 shrink-0 translate-y-0.5 opacity-40 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
      }
    />
  );
}
