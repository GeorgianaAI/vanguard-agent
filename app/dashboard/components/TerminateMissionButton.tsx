import { LogOut, Power } from "lucide-react";
import { MissionActionButton } from "@/app/components/ui/MissionActionButton";

type TerminateMissionButtonProps = {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
};

export function TerminateMissionButton({
  disabled,
  pending,
  onClick,
}: TerminateMissionButtonProps) {
  return (
    <MissionActionButton
      onClick={onClick}
      disabled={disabled}
      title={pending ? "Terminating mission..." : "Terminate Mission"}
      subtitle="Log Out"
      variant="rose"
      leftIcon={
        <Power className="h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:text-rose-500" />
      }
      rightIcon={
        <LogOut className="h-2.5 w-2.5 shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
      }
    />
  );
}
