import { ChevronLeft } from "lucide-react";
import { MissionNavButton } from "@/app/components/ui/MissionNavButton";

export function GovernanceBackToDashboardButton() {
  return (
    <div className="mb-12 flex flex-wrap items-center gap-3">
      <MissionNavButton
        href="/dashboard"
        dataTestId="governance-back-dashboard"
        label="Back to Command Center"
        leftIcon={
          <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        }
      />
    </div>
  );
}
