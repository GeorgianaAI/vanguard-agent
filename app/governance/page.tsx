import { AdvisorySignals } from "./components/AdvisorySignals";
import { DecisionIntegrityLedger } from "./components/DecisionIntegrityLedger";
import { EvidenceTrail } from "./components/EvidenceTrail";
import { GovernanceBackToDashboardButton } from "./components/GovernanceBackToDashboardButton";
import { GovernancePageHeader } from "./components/GovernancePageHeader";
import { NistMetricsCards } from "./components/NistMetricsCards";
import { GovernanceDataProvider } from "./hooks/useGovernanceData";

export default function VanguardGovernancePage() {
  return (
    <div className="isolate min-h-screen w-full min-w-0 bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      <div className="mx-auto w-full min-w-0 max-w-[min(100%,90rem)] overflow-x-clip px-4 pb-24 pt-32 sm:px-6 md:p-8">
        <GovernanceBackToDashboardButton />

        <GovernanceDataProvider>
          <main
            data-testid="governance-ledger"
            className="min-w-0 max-w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <GovernancePageHeader />

            <div className="grid w-full min-w-0 grid-cols-12 gap-4 md:gap-6 lg:items-start">
              <section
                data-testid="governance-primary-stack"
                className="order-1 col-span-12 flex min-h-0 w-full min-w-0 max-w-full flex-col gap-6 text-left lg:col-span-8"
              >
                <DecisionIntegrityLedger />
                <AdvisorySignals />
                <NistMetricsCards />
              </section>

              <EvidenceTrail />
            </div>
          </main>
        </GovernanceDataProvider>
      </div>
    </div>
  );
}
