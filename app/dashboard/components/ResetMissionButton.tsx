import { ArrowLeftToLine, RefreshCw } from "lucide-react";
import { MissionActionButton } from "@/app/components/ui/MissionActionButton";

type ResetMissionButtonProps = {
  onReset: () => void;
};

export function ResetMissionButton({ onReset }: ResetMissionButtonProps) {
  return (
    <MissionActionButton
      onClick={onReset}
      title="Reset Mission"
      subtitle="Wipe History & Restart"
      variant="emerald"
      className="active:scale-95"
      leftIcon={
        <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-40 transition-transform duration-700 group-hover:rotate-180 group-hover:opacity-100" />
      }
      rightIcon={
        <ArrowLeftToLine className="h-2.5 w-2.5 shrink-0 opacity-40 transition-all group-hover:-translate-x-0.5 group-hover:opacity-100" />
      }
    />
  );
}
