import type { Point, VennDiagram, VennElement, VennSet } from "./models";

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

function withUpdatedElements(diagram: VennDiagram, elements: VennElement[]): VennDiagram {
  return {
    ...diagram,
    metadata: {
      ...diagram.metadata,
      updatedAt: new Date().toISOString(),
    },
    elements,
  };
}

function requireSet(diagram: VennDiagram, setId: string): VennSet {
  const set = diagram.sets.find((currentSet) => currentSet.id === setId);

  if (!set) {
    throw new Error(`No existe el conjunto "${setId}".`);
  }

  return set;
}

function requireElement(diagram: VennDiagram, elementId: string): VennElement {
  const element = diagram.elements.find((currentElement) => currentElement.id === elementId);

  if (!element) {
    throw new Error(`No existe el elemento "${elementId}".`);
  }

  return element;
}

function validateSetMemberships(diagram: VennDiagram, setIds: string[]): string[] {
  const uniqueSetIds = [...new Set(setIds)];

  uniqueSetIds.forEach((setId) => requireSet(diagram, setId));

  return uniqueSetIds;
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

  const elements = diagram.elements.map((element) => ({
    ...element,
    setIds: element.setIds.filter((elementSetId) => elementSetId !== setId),
  }));

  return {
    ...withUpdatedSets(
      diagram,
      diagram.sets.filter((set) => set.id !== setId),
    ),
    elements,
  };
}

export function addElement(diagram: VennDiagram, element: VennElement): VennDiagram {
  if (diagram.elements.some((currentElement) => currentElement.id === element.id)) {
    throw new Error(`Ya existe el elemento "${element.id}".`);
  }

  const setIds = validateSetMemberships(diagram, element.setIds);

  return withUpdatedElements(diagram, [...diagram.elements, { ...element, setIds }]);
}

export function renameElement(diagram: VennDiagram, elementId: string, label: string): VennDiagram {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    throw new Error("El elemento debe tener un nombre.");
  }

  requireElement(diagram, elementId);

  return withUpdatedElements(
    diagram,
    diagram.elements.map((element) =>
      element.id === elementId ? { ...element, label: trimmedLabel } : element,
    ),
  );
}

export function setElementMembership(
  diagram: VennDiagram,
  elementId: string,
  setIds: string[],
): VennDiagram {
  requireElement(diagram, elementId);

  const validatedSetIds = validateSetMemberships(diagram, setIds);

  return withUpdatedElements(
    diagram,
    diagram.elements.map((element) =>
      element.id === elementId ? { ...element, setIds: validatedSetIds } : element,
    ),
  );
}

export function removeElement(diagram: VennDiagram, elementId: string): VennDiagram {
  requireElement(diagram, elementId);

  return withUpdatedElements(
    diagram,
    diagram.elements.filter((element) => element.id !== elementId),
  );
}
