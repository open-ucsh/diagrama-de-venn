import type { VennDiagram, VennSet } from "./models";

const DEFAULT_SET_RADIUS = 160;

function createSet(id: string, name: string, x: number, y: number): VennSet {
  return {
    id,
    name,
    position: { x, y },
    radius: DEFAULT_SET_RADIUS,
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
    sets: [createSet("set-a", "A", 340, 300), createSet("set-b", "B", 500, 300)],
  };
}
