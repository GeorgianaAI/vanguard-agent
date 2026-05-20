import { AdvisorySignals } from "./components/AdvisorySignals";
import { DecisionIntegrityLedger } from "./components/DecisionIntegrityLedger";
import { EvidenceTrail } from "./components/EvidenceTrail";
import { GovernanceStatusBrief } from "./components/GovernanceStatusBrief";
import { GovernanceBackToDashboardButton } from "./components/GovernanceBackToDashboardButton";
import { GovernancePageHeader } from "./components/GovernancePageHeader";
import { NistMetricsCards } from "./components/NistMetricsCards";
import { GovernanceDataProvider } from "./hooks/useGovernanceData";

export default function VanguardGovernancePage() {
  return (
    <div
      className="isolate min-h-screen w-full min-w-0 text-slate-100 selection:bg-cyan-500/30"
      style={{ background: "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(6,182,212,0.25) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 60%), #020617" }}
    >
      <div className="mx-auto w-full min-w-0 max-w-[min(100%,90rem)] overflow-x-clip px-4 pb-24 pt-6 sm:px-6 md:p-8">
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

              <div className="order-2 col-span-12 flex w-full min-w-0 max-w-full flex-col gap-6 lg:col-span-4 lg:order-2 lg:self-start">
                <EvidenceTrail />
                <GovernanceStatusBrief />
              </div>
            </div>
          </main>
        </GovernanceDataProvider>
      </div>
    </div>
  );
}
