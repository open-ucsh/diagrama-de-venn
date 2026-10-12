import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import { addElement } from "@/domain/venn/operations";
import { createProjectFile, parseProjectFile } from "@/domain/venn/project-file";

describe("Venn project files", () => {
  it("preserves the diagram and selection through JSON serialization", () => {
    const diagram = addElement(
      createInitialDiagram("Encuesta"),
      createVennElement("Ana", ["set-a", "set-b"]),
    );
    const selection = ["outside", "region:set-a:set-b"];
    const project = createProjectFile(diagram, selection);
    const serialized: unknown = JSON.parse(JSON.stringify(project));

    expect(parseProjectFile(serialized)).toEqual(project);
  });

  it("copies the selection when creating a project", () => {
    const selection = ["region:set-a"];
    const project = createProjectFile(createInitialDiagram(), selection);

    selection.push("outside");

    expect(project.selectedRegionIds).toEqual(["region:set-a"]);
  });

  it("removes duplicate and unknown selected regions when parsing", () => {
    const project = createProjectFile(createInitialDiagram(), [
      "region:set-a",
      "unknown-region",
      "region:set-a",
      "outside",
    ]);

    expect(parseProjectFile(project).selectedRegionIds).toEqual(["region:set-a", "outside"]);
  });

  it("rejects an unsupported version", () => {
    const project = createProjectFile(createInitialDiagram(), []);

    expect(() => parseProjectFile({ ...project, version: 2 })).toThrow(
      "La versión del proyecto no es compatible.",
    );
  });

  it("rejects duplicate set identifiers", () => {
    const diagram = createInitialDiagram();
    const project = createProjectFile(
      {
        ...diagram,
        sets: diagram.sets.map((set) => ({ ...set, id: "duplicate" })),
      },
      [],
    );

    expect(() => parseProjectFile(project)).toThrow(
      "El proyecto contiene identificadores de conjuntos repetidos.",
    );
  });

  it("rejects an element with an unknown membership", () => {
    const diagram = createInitialDiagram();
    const project = createProjectFile(
      {
        ...diagram,
        elements: [createVennElement("Ana", ["unknown-set"])],
      },
      [],
    );

    expect(() => parseProjectFile(project)).toThrow("El proyecto contiene un elemento inválido.");
  });
});
