import { createVennElement } from "./factories";
import type { VennDiagram, VennElement } from "./models";
import { renameSet } from "./operations";
import { createRegionId } from "./regions";

export function parseElementLabels(input: string): string[] {
  const value = input.trim();
  const startsWithBrace = value.startsWith("{");
  const endsWithBrace = value.endsWith("}");

  if (startsWithBrace !== endsWithBrace) {
    throw new Error("Usa ambas llaves o escribe los elementos sin llaves.");
  }

  const content = startsWithBrace ? value.slice(1, -1) : value;

  if (/[{}]/.test(content)) {
    throw new Error("Escribe una lista simple de elementos separados por comas.");
  }

  if (!content.trim()) {
    return [];
  }

  const labels = content.split(",").map((label) => label.trim());

  if (labels.some((label) => !label)) {
    throw new Error("Hay un elemento vacío entre las comas.");
  }

  return [...new Set(labels)];
}

export function formatElementLabels(labels: string[]): string {
  return labels.length === 0 ? "∅" : `{${labels.join(", ")}}`;
}

export function getSetElements(diagram: VennDiagram, setId: string): VennElement[] {
  return diagram.elements.filter((element) => element.setIds.includes(setId));
}

export function getSelectedElements(diagram: VennDiagram, regionIds: string[]): VennElement[] {
  const selectedIds = new Set(regionIds);

  return diagram.elements.filter((element) => selectedIds.has(createRegionId(element.setIds)));
}

function indexElements(diagram: VennDiagram): Map<string, VennElement> {
  const elements = new Map<string, VennElement>();

  for (const element of diagram.elements) {
    const label = element.label.trim();

    if (!label) {
      throw new Error("El diagrama contiene un elemento sin nombre.");
    }

    if (elements.has(label)) {
      throw new Error(
        `Hay varios elementos llamados "${label}". Renómbralos antes de editar la lista.`,
      );
    }

    elements.set(label, element);
  }

  return elements;
}

function haveSameElements(first: VennElement[], second: VennElement[]): boolean {
  return (
    first.length === second.length &&
    first.every((element, index) => {
      const other = second[index];

      return (
        other !== undefined &&
        element.id === other.id &&
        element.label === other.label &&
        element.setIds.length === other.setIds.length &&
        element.setIds.every((setId) => other.setIds.includes(setId))
      );
    })
  );
}

function withElements(diagram: VennDiagram, elements: VennElement[]): VennDiagram {
  if (haveSameElements(diagram.elements, elements)) {
    return diagram;
  }

  return {
    ...diagram,
    metadata: {
      ...diagram.metadata,
      updatedAt: new Date().toISOString(),
    },
    elements,
  };
}

export function replaceSetElements(
  diagram: VennDiagram,
  setId: string,
  input: string,
): VennDiagram {
  if (!diagram.sets.some((set) => set.id === setId)) {
    throw new Error(`No existe el conjunto "${setId}".`);
  }

  const labels = parseElementLabels(input);
  const requestedLabels = new Set(labels);
  const existingElements = indexElements(diagram);

  const elements = diagram.elements.map((element) => {
    const shouldBelong = requestedLabels.has(element.label.trim());
    const belongs = element.setIds.includes(setId);

    if (shouldBelong === belongs) {
      return element;
    }

    return {
      ...element,
      setIds: shouldBelong
        ? [...element.setIds, setId]
        : element.setIds.filter((currentId) => currentId !== setId),
    };
  });

  for (const label of labels) {
    if (!existingElements.has(label)) {
      elements.push(createVennElement(label, [setId]));
    }
  }

  return withElements(diagram, elements);
}

export function updateSetDefinition(
  diagram: VennDiagram,
  setId: string,
  name: string,
  input: string,
): VennDiagram {
  const renamedDiagram = renameSet(diagram, setId, name);

  return replaceSetElements(renamedDiagram, setId, input);
}

export function replaceUniverseElements(diagram: VennDiagram, input: string): VennDiagram {
  const labels = parseElementLabels(input);
  const requestedLabels = new Set(labels);
  const existingElements = indexElements(diagram);

  const missingMembers = diagram.elements.filter(
    (element) => element.setIds.length > 0 && !requestedLabels.has(element.label.trim()),
  );

  if (missingMembers.length > 0) {
    throw new Error(
      `U debe incluir los elementos de los conjuntos: ${missingMembers
        .map((element) => element.label)
        .join(", ")}.`,
    );
  }

  const elements = diagram.elements.filter((element) => requestedLabels.has(element.label.trim()));

  for (const label of labels) {
    if (!existingElements.has(label)) {
      elements.push(createVennElement(label, []));
    }
  }

  return withElements(diagram, elements);
}
