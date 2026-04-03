"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DashboardMessage } from "@/app/dashboard/lib/types";
import { THREAD_STORAGE_KEY } from "@/app/dashboard/lib/chatHelpers";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

import {
  buildGovernanceViewModelFromData,
  type GovernanceViewModel,
} from "../lib/buildGovernanceViewModel";

type GovernanceDataContextValue = {
  model: GovernanceViewModel;
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

export function GovernanceDataProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<GovernanceViewModel>(() =>
    buildGovernanceViewModelFromData([], null),
  );

  const threadId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getThreadIdFromStorage(window.localStorage);
  }, []);

  useEffect(() => {
    if (!threadId) return;

    const controller = new AbortController();

    void (async () => {
      try {
        const historyRes = await fetch(
          `/api/chat/history?thread_id=${encodeURIComponent(threadId)}`,
          {
            signal: controller.signal,
            credentials: "include",
          },
        );
        if (!historyRes.ok) return;

        const historyData = (await historyRes.json()) as {
          messages?: DashboardMessage[];
        };
        const messages = historyData.messages ?? [];
        if (!messages.length) return;

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

        setModel(buildGovernanceViewModelFromData(messages, evidence));
      } catch {
        // Keep defaults/mocks on any fetch or parsing failure.
      }
    })();

    return () => controller.abort();
  }, [threadId]);

  return (
    <GovernanceDataContext.Provider value={{ model }}>
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

