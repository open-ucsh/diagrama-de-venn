import { replaceUniverseElements, updateSetDefinition } from "@/domain/venn/elements";
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
  type VennHistoryState,
  type VennSelection,
} from "@/state/venn-history";
import { getStorage } from "@/state/venn-storage";

export type { VennSelection } from "@/state/venn-history";

const STORE_NAME = "venn-editor";
const STORE_VERSION = 1;

interface VennStore extends VennHistoryState {
  saveSetDefinition: (setId: string, name: string, input: string) => void;
  saveUniverseDefinition: (input: string) => void;

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
  setSetColor: (setId: string, color: string) => void;
  toggleSetVisibility: (setId: string) => void;

  createElement: (label: string, setIds: string[]) => void;
  renameElement: (elementId: string, label: string) => void;
  setElementMembership: (elementId: string, setIds: string[]) => void;
  removeElement: (elementId: string) => void;
}

function haveSameRegionIds(first: readonly string[], second: readonly string[]): boolean {
  const firstIds = new Set(first);
  const secondIds = new Set(second);

  return firstIds.size === secondIds.size && [...firstIds].every((id) => secondIds.has(id));
}

function clearRemovedSelection(
  selection: VennSelection,
  kind: NonNullable<VennSelection>["kind"],
  id: string,
): VennSelection {
  return selection?.kind === kind && selection.id === id ? null : selection;
}

export const useVennStore = create<VennStore>()(
  persist(
    (set) => ({
      diagram: createInitialDiagram(),
      selection: null,
      selectedRegionIds: [],
      past: [],
      future: [],

      saveSetDefinition: (setId, name, input) =>
        set((state) => {
          const diagram = updateSetDefinition(state.diagram, setId, name, input);

          if (diagram === state.diagram) {
            return state;
          }

          return recordHistory(state, { diagram });
        }),

      saveUniverseDefinition: (input) =>
        set((state) => {
          const diagram = replaceUniverseElements(state.diagram, input);

          if (diagram === state.diagram) {
            return state;
          }

          return recordHistory(state, { diagram });
        }),

      undo: () => set(undoHistory),

      redo: () => set(redoHistory),

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
          const normalizedName = name.trim();

          if (!normalizedName || normalizedName === state.diagram.metadata.name) {
            return state;
          }

          return recordHistory(state, {
            diagram: {
              ...state.diagram,
              metadata: {
                ...state.diagram.metadata,
                name: normalizedName,
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
            selectedRegionIds: [...new Set(selectedRegionIds)],
          }),
        ),

      select: (selection) =>
        set((state) =>
          recordHistory(state, {
            selection: selection ? { ...selection } : null,
          }),
        ),

      setRegionSelection: (regionIds) =>
        set((state) => {
          const selectedRegionIds = [...new Set(regionIds)];

          if (haveSameRegionIds(state.selectedRegionIds, selectedRegionIds)) {
            return state;
          }

          return recordHistory(state, {
            selection: null,
            selectedRegionIds,
          });
        }),

      toggleRegionSelection: (regionId) =>
        set((state) => {
          const selectedRegionIds = state.selectedRegionIds.includes(regionId)
            ? state.selectedRegionIds.filter((id) => id !== regionId)
            : [...state.selectedRegionIds, regionId];

          return recordHistory(state, {
            selection: null,
            selectedRegionIds,
          });
        }),

      clearRegionSelection: () =>
        set((state) =>
          recordHistory(state, {
            selectedRegionIds: [],
          }),
        ),

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
            selection: clearRemovedSelection(state.selection, "set", setId),
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
                current.id === setId ? { ...current, color } : current,
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
                current.id === setId ? { ...current, hidden: !current.hidden } : current,
              ),
            },
          });
        }),

      createElement: (label, setIds) =>
        set((state) =>
          recordHistory(state, {
            diagram: addElement(state.diagram, createVennElement(label, setIds)),
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
            selection: clearRemovedSelection(state.selection, "element", elementId),
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
