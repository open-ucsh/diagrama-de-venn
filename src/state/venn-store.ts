import { create } from "zustand";

import { createJSONStorage, persist } from "zustand/middleware";

import {
  createInitialDiagram,
  createVennElement,
  createVennSet,
  DEFAULT_SET_COLORS,
} from "@/domain/venn/factories";

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

import {
  recordHistory,
  redoHistory,
  undoHistory,
  type VennSelection,
  type VennSnapshot,
} from "./venn-history";

export type { VennSelection } from "./venn-history";

import { getStorage } from "./venn-storage";

const STORE_NAME = "venn-editor";
const STORE_VERSION = 1;

interface VennStore {
  diagram: VennDiagram;
  selection: VennSelection;
  selectedRegionIds: string[];

  past: VennSnapshot[];
  future: VennSnapshot[];

  undo: () => void;
  redo: () => void;

  resetDiagram: (name?: string) => void;

  renameDiagram: (name: string) => void;

  importProject: (diagram: VennDiagram, selectedRegionIds: string[]) => void;

  select: (selection: VennSelection) => void;

  setRegionSelection: (regionIds: string[]) => void;

  toggleRegionSelection: (regionId: string) => void;

  clearRegionSelection: () => void;

  createSet: (name: string, position: Point) => void;

  renameSet: (setId: string, name: string) => void;

  moveSet: (setId: string, position: Point) => void;

  removeSet: (setId: string) => void;

  createElement: (label: string, setIds: string[]) => void;

  renameElement: (elementId: string, label: string) => void;

  setElementMembership: (elementId: string, setIds: string[]) => void;

  removeElement: (elementId: string) => void;

  setSetColor: (setId: string, color: string) => void;

  toggleSetVisibility: (setId: string) => void;
}

function haveSameRegionIds(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const firstIds = new Set(first);

  return second.every((id) => firstIds.has(id));
}

export const useVennStore = create<VennStore>()(
  persist(
    (set) => ({
      diagram: createInitialDiagram(),

      selection: null,
      selectedRegionIds: [],

      past: [],
      future: [],

      undo: () => set((state) => undoHistory(state)),

      redo: () => set((state) => redoHistory(state)),

      resetDiagram: (name) =>
        set((state) =>
          recordHistory(state, {
            diagram: createInitialDiagram(name),

            selection: null,
            selectedRegionIds: [],
          }),
        ),

      renameDiagram: (name) =>
        set((state) => {
          const trimmedName = name.trim();

          if (!trimmedName || trimmedName === state.diagram.metadata.name) {
            return state;
          }

          return recordHistory(state, {
            diagram: {
              ...state.diagram,

              metadata: {
                ...state.diagram.metadata,

                name: trimmedName,

                updatedAt: new Date().toISOString(),
              },
            },
          });
        }),

      importProject: (diagram, selectedRegionIds) =>
        set((state) =>
          recordHistory(state, {
            diagram,
            selection: null,

            selectedRegionIds: [...selectedRegionIds],
          }),
        ),

      select: (selection) =>
        set((state) => {
          if (state.selection?.id === selection?.id && state.selection?.kind === selection?.kind) {
            return state;
          }

          return recordHistory(state, {
            selection,
          });
        }),

      setRegionSelection: (regionIds) =>
        set((state) => {
          const uniqueRegionIds = [...new Set(regionIds)];

          if (haveSameRegionIds(state.selectedRegionIds, uniqueRegionIds)) {
            return state;
          }

          return recordHistory(state, {
            selection: null,

            selectedRegionIds: uniqueRegionIds,
          });
        }),

      toggleRegionSelection: (regionId) =>
        set((state) => {
          const selectedRegionIds = state.selectedRegionIds.includes(regionId)
            ? state.selectedRegionIds.filter((currentRegionId) => currentRegionId !== regionId)
            : [...state.selectedRegionIds, regionId];

          return recordHistory(state, {
            selection: null,
            selectedRegionIds,
          });
        }),

      clearRegionSelection: () =>
        set((state) => {
          if (state.selectedRegionIds.length === 0) {
            return state;
          }

          return recordHistory(state, {
            selectedRegionIds: [],
          });
        }),

      createSet: (name, position) =>
        set((state) => {
          const color = DEFAULT_SET_COLORS[state.diagram.sets.length] ?? DEFAULT_SET_COLORS[0];

          const newSet = createVennSet(name, position, undefined, color);

          return recordHistory(state, {
            diagram: addSet(state.diagram, newSet),

            selection: {
              id: newSet.id,
              kind: "set",
            },

            selectedRegionIds: [],
          });
        }),

      renameSet: (setId, name) =>
        set((state) =>
          recordHistory(state, {
            diagram: renameSet(state.diagram, setId, name),

            selectedRegionIds: [],
          }),
        ),

      setSetColor: (setId, color) =>
        set((state) => {
          const currentSet = state.diagram.sets.find((current) => current.id === setId);

          if (!currentSet || currentSet.color === color) {
            return state;
          }

          return recordHistory(state, {
            diagram: {
              ...state.diagram,

              metadata: {
                ...state.diagram.metadata,

                updatedAt: new Date().toISOString(),
              },

              sets: state.diagram.sets.map((current) =>
                current.id === setId
                  ? {
                      ...current,
                      color,
                    }
                  : current,
              ),
            },
          });
        }),

      toggleSetVisibility: (setId) =>
        set((state) => {
          const exists = state.diagram.sets.some((current) => current.id === setId);

          if (!exists) {
            return state;
          }

          return recordHistory(state, {
            diagram: {
              ...state.diagram,

              metadata: {
                ...state.diagram.metadata,

                updatedAt: new Date().toISOString(),
              },

              sets: state.diagram.sets.map((current) =>
                current.id === setId
                  ? {
                      ...current,

                      hidden: !current.hidden,
                    }
                  : current,
              ),
            },
          });
        }),

      moveSet: (setId, position) =>
        set((state) =>
          recordHistory(state, {
            diagram: moveSet(state.diagram, setId, position),

            selectedRegionIds: [],
          }),
        ),

      removeSet: (setId) =>
        set((state) =>
          recordHistory(state, {
            diagram: removeSet(state.diagram, setId),

            selection:
              state.selection?.kind === "set" && state.selection.id === setId
                ? null
                : state.selection,

            selectedRegionIds: [],
          }),
        ),

      createElement: (label, setIds) =>
        set((state) =>
          recordHistory(state, {
            diagram: addElement(
              state.diagram,

              createVennElement(label, setIds),
            ),
          }),
        ),

      renameElement: (elementId, label) =>
        set((state) =>
          recordHistory(state, {
            diagram: renameElement(state.diagram, elementId, label),
          }),
        ),

      setElementMembership: (elementId, setIds) =>
        set((state) =>
          recordHistory(state, {
            diagram: setElementMembership(state.diagram, elementId, setIds),
          }),
        ),

      removeElement: (elementId) =>
        set((state) =>
          recordHistory(state, {
            diagram: removeElement(state.diagram, elementId),

            selection:
              state.selection?.kind === "element" && state.selection.id === elementId
                ? null
                : state.selection,
          }),
        ),
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
