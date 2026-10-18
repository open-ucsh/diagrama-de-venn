import type { VennDiagram } from "@/domain/venn/models";

const MAX_HISTORY_LENGTH = 50;

export type VennSelection =
  | {
      id: string;
      kind: "element";
    }
  | {
      id: string;
      kind: "set";
    }
  | null;

export interface VennSnapshot {
  diagram: VennDiagram;
  selection: VennSelection;
  selectedRegionIds: string[];
}

export interface VennHistoryState extends VennSnapshot {
  past: VennSnapshot[];
  future: VennSnapshot[];
}

function createSnapshot(state: VennSnapshot): VennSnapshot {
  return {
    // Las operaciones del dominio deben actualizar el diagrama de forma inmutable.
    diagram: state.diagram,
    selection: state.selection ? { ...state.selection } : null,
    selectedRegionIds: [...state.selectedRegionIds],
  };
}

function hasSnapshotChanges(state: VennSnapshot, changes: Partial<VennSnapshot>): boolean {
  const next = { ...state, ...changes };

  return (
    state.diagram !== next.diagram ||
    state.selection?.id !== next.selection?.id ||
    state.selection?.kind !== next.selection?.kind ||
    state.selectedRegionIds.length !== next.selectedRegionIds.length ||
    state.selectedRegionIds.some((regionId, index) => regionId !== next.selectedRegionIds[index])
  );
}

export function recordHistory(
  state: VennHistoryState,
  changes: Partial<VennSnapshot>,
): Partial<VennHistoryState> {
  if (!hasSnapshotChanges(state, changes)) {
    return state;
  }

  return {
    ...changes,
    past: [...state.past, createSnapshot(state)].slice(-MAX_HISTORY_LENGTH),
    future: [],
  };
}

export function undoHistory(state: VennHistoryState): Partial<VennHistoryState> {
  const previous = state.past.at(-1);

  if (!previous) {
    return state;
  }

  return {
    ...createSnapshot(previous),
    past: state.past.slice(0, -1),
    future: [createSnapshot(state), ...state.future].slice(0, MAX_HISTORY_LENGTH),
  };
}

export function redoHistory(state: VennHistoryState): Partial<VennHistoryState> {
  const next = state.future[0];

  if (!next) {
    return state;
  }

  return {
    ...createSnapshot(next),
    past: [...state.past, createSnapshot(state)].slice(-MAX_HISTORY_LENGTH),
    future: state.future.slice(1),
  };
}
