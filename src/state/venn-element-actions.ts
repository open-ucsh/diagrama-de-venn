import { replaceUniverseElements, updateSetDefinition } from "@/domain/venn/elements";

import { recordHistory } from "./venn-history";
import { useVennStore } from "./venn-store";

export function saveSetDefinition(setId: string, name: string, input: string): void {
  useVennStore.setState((state) => {
    const diagram = updateSetDefinition(state.diagram, setId, name, input);

    if (diagram === state.diagram) {
      return state;
    }

    return recordHistory(state, { diagram });
  });
}

export function saveUniverseDefinition(input: string): void {
  useVennStore.setState((state) => {
    const diagram = replaceUniverseElements(state.diagram, input);

    if (diagram === state.diagram) {
      return state;
    }

    return recordHistory(state, { diagram });
  });
}
