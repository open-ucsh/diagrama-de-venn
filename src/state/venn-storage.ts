import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";

import { parseProjectFile } from "@/domain/venn/project-file";

const STORAGE_VERSION = 1;

type RecoveryIssue = "invalid-json" | "unsupported-version" | "invalid-data" | "unavailable";

interface StorageRecovery {
  issue: RecoveryIssue | null;
  resolve: () => void;
}

export const useStorageRecovery = create<StorageRecovery>((set) => ({
  issue: null,
  resolve: () => set({ issue: null }),
}));

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(name: string): string | null {
      return values.get(name) ?? null;
    },

    setItem(name: string, value: string): void {
      values.set(name, value);
    },

    removeItem(name: string): void {
      values.delete(name);
    },
  };
}

const memoryStorage = createMemoryStorage();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reportIssue(issue: RecoveryIssue): null {
  useStorageRecovery.setState({ issue });

  return null;
}

export function createRecoverableStorage(storage: Storage): StateStorage {
  return {
    getItem(name) {
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

      if (value.version !== STORAGE_VERSION) {
        return reportIssue("unsupported-version");
      }

      if (!isRecord(value.state)) {
        return reportIssue("invalid-data");
      }

      let normalized: string;

      try {
        const project = parseProjectFile({
          version: 1,
          diagram: value.state.diagram,
          selectedRegionIds: [],
        });

        // Solo permite hidratar los datos persistidos, nunca las acciones del store.
        normalized = JSON.stringify({
          version: STORAGE_VERSION,
          state: {
            diagram: project.diagram,
          },
        });
      } catch {
        return reportIssue("invalid-data");
      }

      useStorageRecovery.getState().resolve();

      return normalized;
    },

    setItem(name, value) {
      // Conserva los datos originales hasta que se resuelva la recuperación.
      if (useStorageRecovery.getState().issue !== null) {
        return;
      }

      try {
        storage.setItem(name, value);
      } catch {
        reportIssue("unavailable");
      }
    },

    removeItem(name) {
      try {
        storage.removeItem(name);
      } catch (error) {
        reportIssue("unavailable");
        throw error;
      }
    },
  };
}

export function getStorage(): StateStorage {
  if (typeof window === "undefined") {
    return memoryStorage;
  }

  try {
    const storage = window.localStorage;

    if (
      typeof storage?.getItem === "function" &&
      typeof storage.setItem === "function" &&
      typeof storage.removeItem === "function"
    ) {
      return createRecoverableStorage(storage);
    }
  } catch {
    return memoryStorage;
  }

  return memoryStorage;
}
