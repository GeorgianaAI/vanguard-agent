import { Scale } from "lucide-react";
import { MissionActionButton } from "@/app/components/ui/MissionActionButton";

export function GovernanceLedgerButton() {
  return (
    <MissionActionButton
      href="/governance"
      title="Governance Ledger"
      subtitle="NIST Compliance View"
      variant="blue"
      leftIcon={
        <Scale className="h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:text-blue-500" />
      }
    />
  );
}
