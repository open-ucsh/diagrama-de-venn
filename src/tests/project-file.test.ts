import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import { addElement } from "@/domain/venn/operations";
import { createProjectFile, parseProjectFile } from "@/domain/venn/project-file";

describe("Archivos de proyectos de Venn", () => {
  it("conserva el diagrama y la selección al serializar y leer el proyecto", () => {
    const diagram = addElement(
      createInitialDiagram("Encuesta"),
      createVennElement("Ana", ["set-a", "set-b"]),
    );
    const selectedRegionIds = ["outside", "region:set-a:set-b"];
    const project = createProjectFile(diagram, selectedRegionIds);
    const serializedProject: unknown = JSON.parse(JSON.stringify(project));

    expect(parseProjectFile(serializedProject)).toEqual(project);
  });

  it("copia la selección para evitar cambios externos posteriores", () => {
    const selectedRegionIds = ["region:set-a"];
    const project = createProjectFile(createInitialDiagram(), selectedRegionIds);

    selectedRegionIds.push("outside");

    expect(project.selectedRegionIds).toEqual(["region:set-a"]);
  });

  it("elimina las regiones seleccionadas duplicadas o desconocidas durante la lectura", () => {
    const project = createProjectFile(createInitialDiagram(), [
      "region:set-a",
      "unknown-region",
      "region:set-a",
      "outside",
    ]);

    const parsedProject = parseProjectFile(project);

    expect(parsedProject.selectedRegionIds).toEqual(["region:set-a", "outside"]);
  });

  it("rechaza una versión no compatible", () => {
    const project = createProjectFile(createInitialDiagram(), []);

    expect(() => parseProjectFile({ ...project, version: 2 })).toThrow(
      "La versión del proyecto no es compatible.",
    );
  });

  it("rechaza los identificadores de conjuntos duplicados", () => {
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

  it("rechaza un elemento que pertenece a un conjunto desconocido", () => {
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
