import type { Point, VennDiagram, VennElement, VennSet } from "./models";

export const DEFAULT_SET_RADIUS = 160;

export const DEFAULT_SET_COLORS = ["#004574", "#f59e0b", "#7c3aed", "#059669"] as const;

const CIRCLE_LAYOUTS: Record<number, Point[]> = {
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

export function createVennSet(
  name: string,
  position: Point,
  radius: number = DEFAULT_SET_RADIUS,
  color: string = DEFAULT_SET_COLORS[0],
): VennSet {
  return {
    id: crypto.randomUUID(),
    name,
    position,
    radius,
    shape: "circle",
    radiusX: radius,
    radiusY: radius,
    rotation: 0,
    color,
    hidden: false,
  };
}

export function createCircleSetLayout(sets: VennSet[]): VennSet[] {
  const positions = CIRCLE_LAYOUTS[sets.length];

  if (!positions) {
    return sets.map((set) => ({
      ...set,
      shape: "circle",
      radius: DEFAULT_SET_RADIUS,
      radiusX: DEFAULT_SET_RADIUS,
      radiusY: DEFAULT_SET_RADIUS,
      rotation: 0,
    }));
  }

  return sets.map((set, index) => ({
    ...set,
    position: positions[index] ?? set.position,

    shape: "circle",
    radius: DEFAULT_SET_RADIUS,
    radiusX: DEFAULT_SET_RADIUS,
    radiusY: DEFAULT_SET_RADIUS,
    rotation: 0,
  }));
}

export function createFourSetEllipseLayout(sets: VennSet[]): VennSet[] {
  if (sets.length !== 4) {
    return sets;
  }

  return sets.map((set, index) => {
    const layout = FOUR_SET_ELLIPSE_LAYOUT[index];

    if (!layout) {
      return set;
    }

    return {
      ...set,
      position: {
        ...layout.position,
      },

      shape: "ellipse",
      radius: DEFAULT_SET_RADIUS,
      radiusX: layout.radiusX,
      radiusY: layout.radiusY,
      rotation: layout.rotation,
    };
  });
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

  const initialSets: VennSet[] = [
    {
      id: "set-a",
      name: "A",
      position: { x: 370, y: 300 },
      radius: DEFAULT_SET_RADIUS,
      shape: "circle",
      radiusX: DEFAULT_SET_RADIUS,
      radiusY: DEFAULT_SET_RADIUS,
      rotation: 0,
      color: DEFAULT_SET_COLORS[0],
      hidden: false,
    },
    {
      id: "set-b",
      name: "B",
      position: { x: 530, y: 300 },
      radius: DEFAULT_SET_RADIUS,
      shape: "circle",
      radiusX: DEFAULT_SET_RADIUS,
      radiusY: DEFAULT_SET_RADIUS,
      rotation: 0,
      color: DEFAULT_SET_COLORS[1],
      hidden: false,
    },
  ];

  return {
    id: crypto.randomUUID(),

    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },

    sets: initialSets,
    elements: [],
  };
}
