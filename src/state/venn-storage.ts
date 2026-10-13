import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";

import { parseProjectFile } from "@/domain/venn/project-file";

type RecoveryIssue = "invalid-json" | "unsupported-version" | "invalid-data" | "unavailable";

interface StorageRecovery {
  issue: RecoveryIssue | null;
  resolve: () => void;
}

export const useStorageRecovery = create<StorageRecovery>((set) => ({
  issue: null,
  resolve: () => set({ issue: null }),
}));

const memoryStorage = (() => {
  const values = new Map<string, string>();

  return {
    getItem: (name: string) => values.get(name) ?? null,
    removeItem: (name: string) => {
      values.delete(name);
    },
    setItem: (name: string, value: string) => {
      values.set(name, value);
    },
  };
})();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reportIssue(issue: RecoveryIssue): null {
  useStorageRecovery.setState({ issue });
  return null;
}

export function createRecoverableStorage(storage: Storage): StateStorage {
  return {
    getItem: (name) => {
      let raw: string | null;

      try {
        raw = storage.getItem(name);
      } catch {
        return reportIssue("unavailable");
      }

      if (raw === null) {
        useStorageRecovery.getState().resolve();
        return null;
      }

      let value: unknown;

      try {
        value = JSON.parse(raw);
      } catch {
        return reportIssue("invalid-json");
      }

      if (!isRecord(value)) {
        return reportIssue("invalid-data");
      }

      if (value.version !== 1) {
        return reportIssue("unsupported-version");
      }

      if (!isRecord(value.state)) {
        return reportIssue("invalid-data");
      }

      try {
        const project = parseProjectFile({
          version: 1,
          diagram: value.state.diagram,
          selectedRegionIds: [],
        });

        useStorageRecovery.getState().resolve();

        return JSON.stringify({
          version: 1,
          state: {
            diagram: project.diagram,
          },
        });
      } catch {
        return reportIssue("invalid-data");
      }
    },

    setItem: (name, value) => {
      if (useStorageRecovery.getState().issue !== null) {
        return;
      }

      try {
        storage.setItem(name, value);
      } catch {
        reportIssue("unavailable");
      }
    },

    removeItem: (name) => {
      storage.removeItem(name);
    },
  };
}

export function getStorage(): StateStorage {
  if (typeof window === "undefined") {
    return memoryStorage;
  }

  try {
    const browserStorage = window.localStorage;

    if (
      typeof browserStorage?.getItem === "function" &&
      typeof browserStorage?.removeItem === "function" &&
      typeof browserStorage?.setItem === "function"
    ) {
      return createRecoverableStorage(browserStorage);
    }
  } catch {
    return memoryStorage;
  }

  return memoryStorage;
}
