import type { Point, VennDiagram, VennElement, VennSet } from "@/domain/venn/models";

export const DEFAULT_SET_RADIUS = 160;

export const DEFAULT_SET_COLORS = ["#244F80", "#D5A52A", "#278B76", "#55A8B8"] as const;

const CIRCLE_LAYOUTS: Readonly<Partial<Record<number, readonly Readonly<Point>[]>>> = {
  1: [{ x: 450, y: 300 }],
  2: [
    { x: 370, y: 300 },
    { x: 530, y: 300 },
  ],
  3: [
    { x: 370, y: 280 },
    { x: 530, y: 280 },
    { x: 450, y: 420 },
  ],
};

const FOUR_SET_ELLIPSE_LAYOUT = [
  {
    position: { x: 350, y: 350 },
    radiusX: 250,
    radiusY: 105,
    rotation: 45,
  },
  {
    position: { x: 475, y: 285 },
    radiusX: 250,
    radiusY: 105,
    rotation: 45,
  },
  {
    position: { x: 425, y: 285 },
    radiusX: 250,
    radiusY: 105,
    rotation: -45,
  },
  {
    position: { x: 550, y: 350 },
    radiusX: 250,
    radiusY: 105,
    rotation: -45,
  },
] as const;

function createCircleSet(
  id: string,
  name: string,
  position: Point,
  radius: number,
  color: string,
): VennSet {
  return {
    id,
    name,
    position: { ...position },
    radius,
    shape: "circle",
    radiusX: radius,
    radiusY: radius,
    rotation: 0,
    color,
    hidden: false,
  };
}

export function createVennSet(
  name: string,
  position: Point,
  radius = DEFAULT_SET_RADIUS,
  color: string = DEFAULT_SET_COLORS[0],
): VennSet {
  return createCircleSet(crypto.randomUUID(), name, position, radius, color);
}

export function createCircleSetLayout(sets: VennSet[]): VennSet[] {
  const positions = CIRCLE_LAYOUTS[sets.length];

  return sets.map((set, index) => ({
    ...set,
    position: { ...(positions?.[index] ?? set.position) },
    shape: "circle",
    radius: DEFAULT_SET_RADIUS,
    radiusX: DEFAULT_SET_RADIUS,
    radiusY: DEFAULT_SET_RADIUS,
    rotation: 0,
  }));
}

export function createFourSetEllipseLayout(sets: VennSet[]): VennSet[] {
  if (sets.length !== FOUR_SET_ELLIPSE_LAYOUT.length) {
    return sets;
  }

  return sets.map((set, index) => {
    const layout = FOUR_SET_ELLIPSE_LAYOUT[index];

    if (!layout) {
      return set;
    }

    return {
      ...set,
      position: { ...layout.position },
      shape: "ellipse",
      radius: DEFAULT_SET_RADIUS,
      radiusX: layout.radiusX,
      radiusY: layout.radiusY,
      rotation: layout.rotation,
    };
  });
}

export function createVennElement(label: string, setIds: string[]): VennElement {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new Error("El elemento debe tener un nombre.");
  }

  return {
    id: crypto.randomUUID(),
    label: normalizedLabel,
    setIds: [...new Set(setIds)],
  };
}

export function createInitialDiagram(name = "Diagrama de Venn"): VennDiagram {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    sets: [
      createCircleSet("set-a", "A", { x: 370, y: 300 }, DEFAULT_SET_RADIUS, DEFAULT_SET_COLORS[0]),
      createCircleSet("set-b", "B", { x: 530, y: 300 }, DEFAULT_SET_RADIUS, DEFAULT_SET_COLORS[1]),
    ],
    elements: [],
  };
}
