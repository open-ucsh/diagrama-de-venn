import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createInitialDiagram, createVennElement, createVennSet } from "@/domain/venn/factories";
import type { Point, VennDiagram } from "@/domain/venn/models";
import {
  addElement,
  addSet,
  moveSet,
  removeElement,
  removeSet,
  renameElement,
  renameSet,
  setElementMembership,
} from "@/domain/venn/operations";

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

function getStorage() {
  if (typeof window === "undefined") {
    return memoryStorage;
  }

  const browserStorage = window.localStorage;

  if (
    typeof browserStorage?.getItem === "function" &&
    typeof browserStorage?.removeItem === "function" &&
    typeof browserStorage?.setItem === "function"
  ) {
    return browserStorage;
  }

  return memoryStorage;
}

const STORE_NAME = "venn-editor";
const STORE_VERSION = 1;

export type VennSelection =
  | { id: string; kind: "element" }
  | { id: string; kind: "region" }
  | { id: string; kind: "set" }
  | null;

interface VennStore {
  diagram: VennDiagram;
  selection: VennSelection;

  resetDiagram: (name?: string) => void;
  select: (selection: VennSelection) => void;

  createSet: (name: string, position: Point) => void;
  renameSet: (setId: string, name: string) => void;
  moveSet: (setId: string, position: Point) => void;
  removeSet: (setId: string) => void;

  createElement: (label: string, setIds: string[]) => void;
  renameElement: (elementId: string, label: string) => void;
  setElementMembership: (elementId: string, setIds: string[]) => void;
  removeElement: (elementId: string) => void;
}

export const useVennStore = create<VennStore>()(
  persist(
    (set) => ({
      diagram: createInitialDiagram(),
      selection: null,

      resetDiagram: (name) =>
        set({
          diagram: createInitialDiagram(name),
          selection: null,
        }),

      select: (selection) => set({ selection }),

      createSet: (name, position) =>
        set((state) => ({
          diagram: addSet(state.diagram, createVennSet(name, position)),
        })),

      renameSet: (setId, name) =>
        set((state) => ({
          diagram: renameSet(state.diagram, setId, name),
        })),

      moveSet: (setId, position) =>
        set((state) => ({
          diagram: moveSet(state.diagram, setId, position),
        })),

      removeSet: (setId) =>
        set((state) => ({
          diagram: removeSet(state.diagram, setId),
          selection:
            state.selection?.kind === "set" && state.selection.id === setId
              ? null
              : state.selection,
        })),

      createElement: (label, setIds) =>
        set((state) => ({
          diagram: addElement(state.diagram, createVennElement(label, setIds)),
        })),

      renameElement: (elementId, label) =>
        set((state) => ({
          diagram: renameElement(state.diagram, elementId, label),
        })),

      setElementMembership: (elementId, setIds) =>
        set((state) => ({
          diagram: setElementMembership(state.diagram, elementId, setIds),
        })),

      removeElement: (elementId) =>
        set((state) => ({
          diagram: removeElement(state.diagram, elementId),
          selection:
            state.selection?.kind === "element" && state.selection.id === elementId
              ? null
              : state.selection,
        })),
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        diagram: state.diagram,
      }),
    },
  ),
);
