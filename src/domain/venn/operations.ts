import type { Point, VennDiagram, VennSet } from "./models";

export const MAX_SETS = 3;
export const MIN_SETS = 1;

function withUpdatedSets(diagram: VennDiagram, sets: VennSet[]): VennDiagram {
  return {
    ...diagram,
    metadata: {
      ...diagram.metadata,
      updatedAt: new Date().toISOString(),
    },
    sets,
  };
}

function requireSet(diagram: VennDiagram, setId: string): VennSet {
  const set = diagram.sets.find((currentSet) => currentSet.id === setId);

  if (!set) {
    throw new Error(`No existe el conjunto "${setId}".`);
  }

  return set;
}

export function addSet(diagram: VennDiagram, set: VennSet): VennDiagram {
  if (diagram.sets.length >= MAX_SETS) {
    throw new Error(`Un diagrama puede tener como máximo ${MAX_SETS} conjuntos.`);
  }

  return withUpdatedSets(diagram, [...diagram.sets, set]);
}

export function renameSet(diagram: VennDiagram, setId: string, name: string): VennDiagram {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("El nombre del conjunto no puede estar vacío.");
  }

  requireSet(diagram, setId);

  return withUpdatedSets(
    diagram,
    diagram.sets.map((set) => (set.id === setId ? { ...set, name: trimmedName } : set)),
  );
}

export function moveSet(diagram: VennDiagram, setId: string, position: Point): VennDiagram {
  requireSet(diagram, setId);

  return withUpdatedSets(
    diagram,
    diagram.sets.map((set) => (set.id === setId ? { ...set, position: { ...position } } : set)),
  );
}

export function removeSet(diagram: VennDiagram, setId: string): VennDiagram {
  if (diagram.sets.length <= MIN_SETS) {
    throw new Error(`Un diagrama debe tener al menos ${MIN_SETS} conjunto.`);
  }

  requireSet(diagram, setId);

  return withUpdatedSets(
    diagram,
    diagram.sets.filter((set) => set.id !== setId),
  );
}
