"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DashboardMessage } from "@/app/dashboard/lib/types";
import { THREAD_STORAGE_KEY } from "@/app/dashboard/lib/chatHelpers";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

import {
  buildGovernanceViewModelFromData,
  type GovernanceCheckpointExtras,
  type GovernanceViewModel,
} from "../lib/buildGovernanceViewModel";

/** Client mount + thread + fetch settlement — drives empty vs uplink-sync vs ready UI. */
export type GovernanceLoadPhase = "synchronizing" | "no-session" | "ready";

type GovernanceDataContextValue = {
  model: GovernanceViewModel;
  threadId: string | null;
  loadPhase: GovernanceLoadPhase;
};

const GovernanceDataContext = createContext<GovernanceDataContextValue | null>(
  null,
);

export type StorageReader = Pick<Storage, "getItem">;

export function getThreadIdFromStorage(
  storage: StorageReader | null | undefined,
): string | null {
  if (!storage) return null;
  const threadId = storage.getItem(THREAD_STORAGE_KEY);
  if (!threadId || threadId.trim().length === 0) return null;
  return threadId;
}

/**
 * Derives UX phase for governance shell. Exported for unit tests.
 * - synchronizing: client not yet mounted, or thread present and fetch not settled
 * - no-session: mounted, no thread id in storage
 * - ready: mounted, fetch attempt finished for current thread (or no-thread path)
 */
export function deriveGovernanceLoadPhase(
  mounted: boolean,
  threadId: string | null,
  fetchSettled: boolean,
): GovernanceLoadPhase {
  if (!mounted) return "synchronizing";
  if (!threadId) return "no-session";
  if (!fetchSettled) return "synchronizing";
  return "ready";
}

export function GovernanceDataProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const threadId = useMemo(() => {
    if (!mounted || typeof window === "undefined") return null;
    return getThreadIdFromStorage(window.localStorage);
  }, [mounted]);

  const [model, setModel] = useState<GovernanceViewModel>(() =>
    buildGovernanceViewModelFromData([], null),
  );

  const [fetchSettled, setFetchSettled] = useState(false);

  const loadPhase = useMemo(
    () => deriveGovernanceLoadPhase(mounted, threadId, fetchSettled),
    [mounted, threadId, fetchSettled],
  );

  useEffect(() => {
    if (!mounted) return;

    const controller = new AbortController();

    if (!threadId) {
      setModel(buildGovernanceViewModelFromData([], null));
      setFetchSettled(true);
      return () => controller.abort();
    }

    setFetchSettled(false);
    setModel(buildGovernanceViewModelFromData([], null));

    void (async () => {
      try {
        const historyRes = await fetch(
          `/api/chat/history?thread_id=${encodeURIComponent(threadId)}`,
          {
            signal: controller.signal,
            credentials: "include",
          },
        );

        if (!historyRes.ok) {
          if (!controller.signal.aborted) {
            setModel(buildGovernanceViewModelFromData([], null));
          }
          return;
        }

        const historyData = (await historyRes.json()) as {
          messages?: DashboardMessage[];
          vulnerabilities?: unknown;
          advisory_enrichment_warnings?: string[];
        };
        const messages = historyData.messages ?? [];

        const extras: GovernanceCheckpointExtras = {
          vulnerabilities: historyData.vulnerabilities,
          advisoryWarnings: historyData.advisory_enrichment_warnings,
        };

        if (!messages.length) {
          if (!controller.signal.aborted) {
            setModel(
              buildGovernanceViewModelFromData([], null, extras, {
                threadId,
              }),
            );
          }
          return;
        }

        let evidence: EvidencePackage | null = null;
        try {
          const evidenceRes = await fetch(
            `/api/audit/evidence?thread_id=${encodeURIComponent(threadId)}`,
            {
              signal: controller.signal,
              credentials: "include",
            },
          );
          if (evidenceRes.ok) {
            evidence = (await evidenceRes.json()) as EvidencePackage;
          }
        } catch {
          evidence = null;
        }

        if (!controller.signal.aborted) {
          setModel(
            buildGovernanceViewModelFromData(messages, evidence, extras, {
              threadId,
            }),
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setModel(buildGovernanceViewModelFromData([], null));
        }
      } finally {
        if (!controller.signal.aborted) {
          setFetchSettled(true);
        }
      }
    })();

    return () => controller.abort();
  }, [mounted, threadId]);

  return (
    <GovernanceDataContext.Provider value={{ model, threadId, loadPhase }}>
      {children}
    </GovernanceDataContext.Provider>
  );
}

export function useGovernanceData(): GovernanceDataContextValue {
  const ctx = useContext(GovernanceDataContext);
  if (!ctx) {
    throw new Error("useGovernanceData must be used within GovernanceDataProvider");
  }
  return ctx;
}
