import { MAX_SETS, MIN_SETS } from "@/domain/venn/constants";
import { createCircleSetLayout, createFourSetEllipseLayout } from "@/domain/venn/factories";
import type { Point, VennDiagram, VennElement, VennSet } from "@/domain/venn/models";

export { MAX_SETS, MIN_SETS } from "@/domain/venn/constants";

function normalizeSetName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function requireUniqueSetName(diagram: VennDiagram, name: string, excludedSetId?: string): string {
  const normalizedName = normalizeSetName(name);

  if (!normalizedName) {
    throw new Error("El nombre del conjunto no puede estar vacío. Escribe un nombre.");
  }

  const comparisonName = normalizedName.toLowerCase();
  const duplicate = diagram.sets.find(
    (set) =>
      set.id !== excludedSetId && normalizeSetName(set.name).toLowerCase() === comparisonName,
  );

  if (duplicate) {
    throw new Error(
      `Ya existe un conjunto llamado "${duplicate.name}". Elige otro nombre; cambiar mayúsculas o espacios no lo distingue.`,
    );
  }

  return normalizedName;
}

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
  const set = diagram.sets.find((current) => current.id === setId);

  if (!set) {
    throw new Error(`No existe el conjunto "${setId}".`);
  }

  return set;
}

function requireElement(diagram: VennDiagram, elementId: string): VennElement {
  const element = diagram.elements.find((current) => current.id === elementId);

  if (!element) {
    throw new Error(`No existe el elemento "${elementId}".`);
  }

  return element;
}

function validateSetMemberships(diagram: VennDiagram, setIds: readonly string[]): string[] {
  const uniqueSetIds = [...new Set(setIds)];

  for (const setId of uniqueSetIds) {
    requireSet(diagram, setId);
  }

  return uniqueSetIds;
}

export function addSet(diagram: VennDiagram, set: VennSet): VennDiagram {
  if (diagram.sets.length >= MAX_SETS) {
    throw new Error(`Un diagrama puede tener como máximo ${MAX_SETS} conjuntos.`);
  }

  if (diagram.sets.some((current) => current.id === set.id)) {
    throw new Error(`Ya existe el conjunto "${set.id}".`);
  }

  const name = requireUniqueSetName(diagram, set.name);
  const sets = [
    ...diagram.sets,
    {
      ...set,
      name,
      position: { ...set.position },
    },
  ];

  return withUpdatedSets(
    diagram,
    sets.length === MAX_SETS ? createFourSetEllipseLayout(sets) : sets,
  );
}

export function renameSet(diagram: VennDiagram, setId: string, name: string): VennDiagram {
  const currentSet = requireSet(diagram, setId);
  const normalizedName = requireUniqueSetName(diagram, name, setId);

  if (currentSet.name === normalizedName) {
    return diagram;
  }

  return withUpdatedSets(
    diagram,
    diagram.sets.map((set) => (set.id === setId ? { ...set, name: normalizedName } : set)),
  );
}

export function moveSet(diagram: VennDiagram, setId: string, position: Point): VennDiagram {
  const currentSet = requireSet(diagram, setId);

  if (currentSet.position.x === position.x && currentSet.position.y === position.y) {
    return diagram;
  }

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

  const remainingSets = diagram.sets.filter((set) => set.id !== setId);
  const sets =
    diagram.sets.length === MAX_SETS ? createCircleSetLayout(remainingSets) : remainingSets;

  const elements = diagram.elements.map((element) =>
    element.setIds.includes(setId)
      ? {
          ...element,
          setIds: element.setIds.filter((id) => id !== setId),
        }
      : element,
  );

  return {
    ...withUpdatedSets(diagram, sets),
    elements,
  };
}

export function addElement(diagram: VennDiagram, element: VennElement): VennDiagram {
  if (diagram.elements.some((current) => current.id === element.id)) {
    throw new Error(`Ya existe el elemento "${element.id}".`);
  }

  const setIds = validateSetMemberships(diagram, element.setIds);

  return withUpdatedElements(diagram, [...diagram.elements, { ...element, setIds }]);
}

export function renameElement(diagram: VennDiagram, elementId: string, label: string): VennDiagram {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new Error("El elemento debe tener un nombre.");
  }

  const currentElement = requireElement(diagram, elementId);

  if (currentElement.label === normalizedLabel) {
    return diagram;
  }

  return withUpdatedElements(
    diagram,
    diagram.elements.map((element) =>
      element.id === elementId ? { ...element, label: normalizedLabel } : element,
    ),
  );
}

export function setElementMembership(
  diagram: VennDiagram,
  elementId: string,
  setIds: string[],
): VennDiagram {
  const currentElement = requireElement(diagram, elementId);
  const validatedSetIds = validateSetMemberships(diagram, setIds);

  if (
    currentElement.setIds.length === validatedSetIds.length &&
    currentElement.setIds.every((setId, index) => setId === validatedSetIds[index])
  ) {
    return diagram;
  }

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
