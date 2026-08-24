import { create } from "zustand";

import { createInitialDiagram, createVennElement, createVennSet } from "../domain/venn/factories";
import {
  addElement,
  addSet,
  moveSet,
  removeElement,
  removeSet,
  renameElement,
  renameSet,
  setElementMembership,
} from "../domain/venn/operations";
import type { Point, VennDiagram } from "../domain/venn/models";

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

export const useVennStore = create<VennStore>((set) => ({
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
        state.selection?.kind === "set" && state.selection.id === setId ? null : state.selection,
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
}));
