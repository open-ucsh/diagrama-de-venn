import {
  createCircleSetLayout,
  createFourSetEllipseLayout,
  createVennElement,
  createVennSet,
  DEFAULT_SET_COLORS,
  DEFAULT_SET_RADIUS,
} from "./factories";

import { getRegionIdsFromMask, getSelectedMask } from "./expressions/expression-masks";

import type { VennDiagram, VennSet } from "./models";

import type { VennProjectFile } from "./project-file";

const SHARE_PARAMETER = "venn";
const SHARE_VERSION = 1;
const MAXIMUM_SET_COUNT = 4;
const MAXIMUM_ELEMENT_COUNT = 200;

type SharedSet = [name: string, color: string, attenuated: 0 | 1];

type SharedElement = [label: string, membershipMask: number];

interface CompactSharedProject {
  v: 1;
  n: string;
  s: SharedSet[];
  r: number;
  e?: SharedElement[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  const missingPadding = normalized.length % 4;

  const padding = missingPadding === 0 ? "" : "=".repeat(4 - missingPadding);

  const binary = window.atob(normalized + padding);

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function getElementMembershipMask(diagram: VennDiagram, setIds: string[]): number {
  const memberships = new Set(setIds);

  return diagram.sets.reduce((mask, set, index) => {
    if (!memberships.has(set.id)) {
      return mask;
    }

    return mask | (1 << index);
  }, 0);
}

function createCompactProject(
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
    ...(elements.length > 0
      ? {
          e: elements,
        }
      : {}),
  };
}

function parseSharedSet(value: unknown): SharedSet {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("El enlace contiene un conjunto inválido.");
  }

  const name = value[0];
  const color = value[1];
  const attenuated = value[2];

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 60 ||
    !isValidColor(color) ||
    (attenuated !== 0 && attenuated !== 1)
  ) {
    throw new Error("El enlace contiene un conjunto inválido.");
  }

  return [name.trim(), color, attenuated];
}

function parseSharedElement(value: unknown, maximumMembershipMask: number): SharedElement {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("El enlace contiene un elemento inválido.");
  }

  const label = value[0];
  const membershipMask = value[1];

  if (
    typeof label !== "string" ||
    !label.trim() ||
    label.length > 100 ||
    typeof membershipMask !== "number" ||
    !Number.isInteger(membershipMask) ||
    membershipMask < 0 ||
    membershipMask > maximumMembershipMask
  ) {
    throw new Error("El enlace contiene un elemento inválido.");
  }

  return [label.trim(), membershipMask];
}

function parseCompactProject(value: unknown): CompactSharedProject {
  if (!isRecord(value)) {
    throw new Error("El enlace compartido no es válido.");
  }

  const version = value.v;
  const name = value.n;
  const rawSets = value.s;
  const selectionMask = value.r;
  const rawElements = value.e;

  if (
    version !== SHARE_VERSION ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 120 ||
    !Array.isArray(rawSets) ||
    rawSets.length < 1 ||
    rawSets.length > MAXIMUM_SET_COUNT ||
    typeof selectionMask !== "number" ||
    !Number.isInteger(selectionMask)
  ) {
    throw new Error("El enlace compartido no es válido.");
  }

  const sets = rawSets.map(parseSharedSet);

  const maximumRegionMask = 2 ** (2 ** sets.length) - 1;

  if (selectionMask < 0 || selectionMask > maximumRegionMask) {
    throw new Error("La selección compartida no es válida.");
  }

  const maximumMembershipMask = 2 ** sets.length - 1;

  if (rawElements !== undefined && !Array.isArray(rawElements)) {
    throw new Error("Los elementos compartidos no son válidos.");
  }

  const elementValues = rawElements ?? [];

  if (elementValues.length > MAXIMUM_ELEMENT_COUNT) {
    throw new Error("El enlace contiene demasiados elementos.");
  }

  const elements = elementValues.map((element) =>
    parseSharedElement(element, maximumMembershipMask),
  );

  return {
    v: SHARE_VERSION,
    n: name.trim(),
    s: sets,
    r: selectionMask,
    ...(elements.length > 0
      ? {
          e: elements,
        }
      : {}),
  };
}

function createDiagramFromCompactProject(project: CompactSharedProject): VennProjectFile {
  const now = new Date().toISOString();

  let sets: VennSet[] = project.s.map(([name, color, attenuated]) => ({
    ...createVennSet(
      name,
      {
        x: 450,
        y: 300,
      },
      DEFAULT_SET_RADIUS,
      color,
    ),
    hidden: attenuated === 1,
  }));

  sets = sets.length === 4 ? createFourSetEllipseLayout(sets) : createCircleSetLayout(sets);

  const diagram: VennDiagram = {
    id: crypto.randomUUID(),
    metadata: {
      name: project.n,
      createdAt: now,
      updatedAt: now,
    },
    sets,
    elements: [],
  };

  diagram.elements = (project.e ?? []).map(([label, membershipMask]) => {
    const setIds = sets
      .filter((_, index) => (membershipMask & (1 << index)) !== 0)
      .map((set) => set.id);

    return createVennElement(label, setIds);
  });

  return {
    version: 1,
    diagram,
    selectedRegionIds: getRegionIdsFromMask(diagram, project.r),
  };
}

export function createShareUrl(diagram: VennDiagram, selectedRegionIds: string[]): string {
  const compactProject = createCompactProject(diagram, selectedRegionIds);

  const encoded = encodeBase64Url(JSON.stringify(compactProject));

  const url = new URL(window.location.href);

  // Elimina cualquier enlace antiguo
  // que estuviera en los parámetros.
  url.searchParams.delete(SHARE_PARAMETER);

  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ""));

  hashParameters.set(SHARE_PARAMETER, encoded);

  url.hash = hashParameters.toString();

  return url.toString();
}

export function consumeSharedProject(): VennProjectFile | null {
  const url = new URL(window.location.href);

  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ""));

  const encoded = hashParameters.get(SHARE_PARAMETER);

  if (!encoded) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(encoded);

    const rawProject: unknown = JSON.parse(decoded);

    const compactProject = parseCompactProject(rawProject);

    return createDiagramFromCompactProject(compactProject);
  } finally {
    hashParameters.delete(SHARE_PARAMETER);

    const remainingHash = hashParameters.toString();

    url.hash = remainingHash ? remainingHash : "";

    window.history.replaceState({}, "", url);
  }
}
