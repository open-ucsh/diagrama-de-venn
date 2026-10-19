import { isRecord } from "@/lib/validation";
import { MAX_SETS, MIN_SETS } from "@/domain/venn/constants";
import { getRegionIdsFromMask, getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import {
  createCircleSetLayout,
  createFourSetEllipseLayout,
  createVennElement,
  createVennSet,
  DEFAULT_SET_COLORS,
  DEFAULT_SET_RADIUS,
} from "@/domain/venn/factories";
import type { VennDiagram } from "@/domain/venn/models";
import type { VennProjectFile } from "@/domain/venn/project-file";

const SHARE_VERSION = 1;
const MAXIMUM_ELEMENT_COUNT = 200;
const MAXIMUM_PROJECT_NAME_LENGTH = 120;
const MAXIMUM_SET_NAME_LENGTH = 60;
const MAXIMUM_ELEMENT_LABEL_LENGTH = 100;

type SharedSet = [name: string, color: string, hidden: 0 | 1];

type SharedElement = [label: string, membershipMask: number];

interface CompactSharedProject {
  v: 1;
  n: string;
  s: SharedSet[];
  r: number;
  e?: SharedElement[];
}

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isValidName(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength;
}

function getElementMembershipMask(diagram: VennDiagram, setIds: readonly string[]): number {
  const memberships = new Set(setIds);

  return diagram.sets.reduce(
    (mask, set, index) => (memberships.has(set.id) ? mask | (1 << index) : mask),
    0,
  );
}

export function createCompactProject(
  diagram: VennDiagram,
  selectedRegionIds: string[],
): CompactSharedProject {
  const sets: SharedSet[] = diagram.sets.map((set, index) => [
    set.name,
    set.color ?? DEFAULT_SET_COLORS[index] ?? DEFAULT_SET_COLORS[0],
    set.hidden ? 1 : 0,
  ]);

  const elements: SharedElement[] = diagram.elements.map((element) => [
    element.label,
    getElementMembershipMask(diagram, element.setIds),
  ]);

  return {
    v: SHARE_VERSION,
    n: diagram.metadata.name,
    s: sets,
    r: getSelectedMask(diagram, selectedRegionIds),
    ...(elements.length > 0 ? { e: elements } : {}),
  };
}

function parseSharedSet(value: unknown): SharedSet {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("El enlace contiene un conjunto inválido.");
  }

  const [name, color, hidden] = value;

  if (
    !isValidName(name, MAXIMUM_SET_NAME_LENGTH) ||
    !isValidColor(color) ||
    (hidden !== 0 && hidden !== 1)
  ) {
    throw new Error("El enlace contiene un conjunto inválido.");
  }

  return [name.trim(), color, hidden];
}

function parseSharedElement(value: unknown, maximumMembershipMask: number): SharedElement {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("El enlace contiene un elemento inválido.");
  }

  const [label, membershipMask] = value;

  if (
    !isValidName(label, MAXIMUM_ELEMENT_LABEL_LENGTH) ||
    typeof membershipMask !== "number" ||
    !Number.isInteger(membershipMask) ||
    membershipMask < 0 ||
    membershipMask > maximumMembershipMask
  ) {
    throw new Error("El enlace contiene un elemento inválido.");
  }

  return [label.trim(), membershipMask];
}

export function parseCompactProject(value: unknown): CompactSharedProject {
  if (!isRecord(value)) {
    throw new Error("El enlace compartido no es válido.");
  }

  const { v: version, n: name, s: rawSets, r: selectionMask, e: rawElements } = value;

  if (
    version !== SHARE_VERSION ||
    !isValidName(name, MAXIMUM_PROJECT_NAME_LENGTH) ||
    !Array.isArray(rawSets) ||
    rawSets.length < MIN_SETS ||
    rawSets.length > MAX_SETS ||
    typeof selectionMask !== "number" ||
    !Number.isInteger(selectionMask)
  ) {
    throw new Error("El enlace compartido no es válido.");
  }

  const sets = rawSets.map(parseSharedSet);

  // Cada combinación de pertenencias es una región y ocupa un bit.
  const regionCount = 2 ** sets.length;
  const maximumRegionMask = 2 ** regionCount - 1;

  if (selectionMask < 0 || selectionMask > maximumRegionMask) {
    throw new Error("La selección compartida no es válida.");
  }

  if (rawElements !== undefined && !Array.isArray(rawElements)) {
    throw new Error("Los elementos compartidos no son válidos.");
  }

  const elementValues = rawElements ?? [];

  if (elementValues.length > MAXIMUM_ELEMENT_COUNT) {
    throw new Error("El enlace contiene demasiados elementos.");
  }

  const maximumMembershipMask = 2 ** sets.length - 1;
  const elements = elementValues.map((element) =>
    parseSharedElement(element, maximumMembershipMask),
  );

  return {
    v: SHARE_VERSION,
    n: name.trim(),
    s: sets,
    r: selectionMask,
    ...(elements.length > 0 ? { e: elements } : {}),
  };
}

export function createDiagramFromCompactProject(project: CompactSharedProject): VennProjectFile {
  const now = new Date().toISOString();

  const initialSets = project.s.map(([name, color, hidden]) => ({
    ...createVennSet(name, { x: 450, y: 300 }, DEFAULT_SET_RADIUS, color),
    hidden: hidden === 1,
  }));

  const sets =
    initialSets.length === MAX_SETS
      ? createFourSetEllipseLayout(initialSets)
      : createCircleSetLayout(initialSets);

  const elements = (project.e ?? []).map(([label, membershipMask]) => {
    const setIds = sets
      .filter((_, index) => (membershipMask & (1 << index)) !== 0)
      .map((set) => set.id);

    return createVennElement(label, setIds);
  });

  const diagram: VennDiagram = {
    id: crypto.randomUUID(),
    metadata: {
      name: project.n,
      createdAt: now,
      updatedAt: now,
    },
    sets,
    elements,
  };

  return {
    version: 1,
    diagram,
    selectedRegionIds: getRegionIdsFromMask(diagram, project.r),
  };
}
