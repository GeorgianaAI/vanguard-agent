import { ChevronLeft, Home } from "lucide-react";
import { MissionNavButton } from "@/app/components/ui/MissionNavButton";

export function ReturnToBaseButton() {
  return (
    <MissionNavButton
      href="/"
      label="Return to Base"
      subtitle="Exit Terminal & Uplink"
      leftIcon={
        <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
      }
      labelIcon={<Home className="h-3 w-3 opacity-60" />}
    />
  );
}
