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

function createSnapshot(state: VennHistoryState): VennSnapshot {
  return {
    diagram: state.diagram,
    selection: state.selection,
    selectedRegionIds: [...state.selectedRegionIds],
  };
}

export function recordHistory(
  state: VennHistoryState,
  changes: Partial<VennSnapshot>,
): Partial<VennHistoryState> {
  const snapshot = createSnapshot(state);

  return {
    ...changes,

    past: [...state.past, snapshot].slice(-MAX_HISTORY_LENGTH),

    future: [],
  };
}

export function undoHistory(state: VennHistoryState): Partial<VennHistoryState> {
  const previous = state.past[state.past.length - 1];

  if (!previous) {
    return state;
  }

  const current = createSnapshot(state);

  return {
    diagram: previous.diagram,

    selection: previous.selection,

    selectedRegionIds: [...previous.selectedRegionIds],

    past: state.past.slice(0, -1),

    future: [current, ...state.future].slice(0, MAX_HISTORY_LENGTH),
  };
}

export function redoHistory(state: VennHistoryState): Partial<VennHistoryState> {
  const next = state.future[0];

  if (!next) {
    return state;
  }

  const current = createSnapshot(state);

  return {
    diagram: next.diagram,
    selection: next.selection,

    selectedRegionIds: [...next.selectedRegionIds],

    past: [...state.past, current].slice(-MAX_HISTORY_LENGTH),

    future: state.future.slice(1),
  };
}
