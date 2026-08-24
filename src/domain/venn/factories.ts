import type { Point, VennDiagram, VennElement, VennSet } from "./models";

const DEFAULT_SET_RADIUS = 160;

export function createVennSet(name: string, position: Point, radius = DEFAULT_SET_RADIUS): VennSet {
  return {
    id: crypto.randomUUID(),
    name,
    position,
    radius,
  };
}

export function createVennElement(label: string, setIds: string[]): VennElement {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    throw new Error("El elemento debe tener un nombre.");
  }

  return {
    id: crypto.randomUUID(),
    label: trimmedLabel,
    setIds: [...new Set(setIds)],
  };
}

export function createInitialDiagram(name = "Diagrama sin título"): VennDiagram {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    sets: [
      {
        id: "set-a",
        name: "A",
        position: { x: 340, y: 300 },
        radius: DEFAULT_SET_RADIUS,
      },
      {
        id: "set-b",
        name: "B",
        position: { x: 500, y: 300 },
        radius: DEFAULT_SET_RADIUS,
      },
    ],
    elements: [],
  };
}
