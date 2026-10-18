import { describe, expect, it } from "vitest";

import { createInitialDiagram } from "@/domain/venn/factories";

describe("Creación del diagrama inicial", () => {
  it("crea los conjuntos iniciales A y B", () => {
    const diagram = createInitialDiagram();

    expect(diagram.sets.map((set) => set.name)).toEqual(["A", "B"]);
  });

  it("utiliza el nombre proporcionado para el diagrama", () => {
    const diagram = createInitialDiagram("Encuesta de estudiantes");

    expect(diagram.metadata.name).toBe("Encuesta de estudiantes");
  });

  it("genera un identificador diferente para cada diagrama", () => {
    const firstDiagram = createInitialDiagram();
    const secondDiagram = createInitialDiagram();

    expect(firstDiagram.id).not.toBe(secondDiagram.id);
  });
});
