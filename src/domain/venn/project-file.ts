import type { VennDiagram, VennElement, VennSet } from "./models";

import { getVennRegions } from "./regions";

export interface VennProjectFile {
  version: 1;
  diagram: VennDiagram;
  selectedRegionIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseSet(value: unknown): VennSet {
  if (!isRecord(value)) {
    throw new Error("El proyecto contiene un conjunto inválido.");
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    !isRecord(value.position) ||
    !isFiniteNumber(value.position.x) ||
    !isFiniteNumber(value.position.y) ||
    !isFiniteNumber(value.radius) ||
    value.radius <= 0
  ) {
    throw new Error("El proyecto contiene datos inválidos en un conjunto.");
  }

  if (value.shape !== undefined && value.shape !== "circle" && value.shape !== "ellipse") {
    throw new Error("El proyecto contiene una figura desconocida.");
  }

  if (
    value.color !== undefined &&
    (typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color))
  ) {
    throw new Error("El proyecto contiene un color inválido.");
  }

  return {
    id: value.id,
    name: value.name,
    position: {
      x: value.position.x,
      y: value.position.y,
    },
    radius: value.radius,

    shape: value.shape === "ellipse" ? "ellipse" : "circle",

    radiusX: isFiniteNumber(value.radiusX) ? value.radiusX : value.radius,

    radiusY: isFiniteNumber(value.radiusY) ? value.radiusY : value.radius,

    rotation: isFiniteNumber(value.rotation) ? value.rotation : 0,

    color: typeof value.color === "string" ? value.color : undefined,

    hidden: typeof value.hidden === "boolean" ? value.hidden : false,
  };
}

function parseElement(value: unknown, validSetIds: Set<string>): VennElement {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    !Array.isArray(value.setIds) ||
    !value.setIds.every((setId) => typeof setId === "string" && validSetIds.has(setId))
  ) {
    throw new Error("El proyecto contiene un elemento inválido.");
  }

  return {
    id: value.id,
    label: value.label,
    setIds: [...new Set(value.setIds as string[])],
  };
}

function parseDiagram(value: unknown): VennDiagram {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isRecord(value.metadata) ||
    typeof value.metadata.name !== "string" ||
    typeof value.metadata.createdAt !== "string" ||
    typeof value.metadata.updatedAt !== "string" ||
    !Array.isArray(value.sets) ||
    !Array.isArray(value.elements)
  ) {
    throw new Error("El archivo no contiene un diagrama válido.");
  }

  if (value.sets.length < 1 || value.sets.length > 4) {
    throw new Error("El diagrama debe contener entre 1 y 4 conjuntos.");
  }

  const sets = value.sets.map(parseSet);

  const setIds = new Set(sets.map((set) => set.id));

  if (setIds.size !== sets.length) {
    throw new Error("El proyecto contiene identificadores de conjuntos repetidos.");
  }

  const elements = value.elements.map((element) => parseElement(element, setIds));

  return {
    id: value.id,

    metadata: {
      name: value.metadata.name,
      createdAt: value.metadata.createdAt,
      updatedAt: value.metadata.updatedAt,
    },

    sets,
    elements,
  };
}

export function createProjectFile(
  diagram: VennDiagram,
  selectedRegionIds: string[],
): VennProjectFile {
  return {
    version: 1,
    diagram,
    selectedRegionIds: [...selectedRegionIds],
  };
}

export function parseProjectFile(value: unknown): VennProjectFile {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("La versión del proyecto no es compatible.");
  }

  const diagram = parseDiagram(value.diagram);

  if (
    !Array.isArray(value.selectedRegionIds) ||
    !value.selectedRegionIds.every((regionId) => typeof regionId === "string")
  ) {
    throw new Error("La selección del proyecto es inválida.");
  }

  const validRegionIds = new Set(getVennRegions(diagram).map((region) => region.id));

  const selectedRegionIds = [...new Set(value.selectedRegionIds as string[])].filter((regionId) =>
    validRegionIds.has(regionId),
  );

  return {
    version: 1,
    diagram,
    selectedRegionIds,
  };
}
