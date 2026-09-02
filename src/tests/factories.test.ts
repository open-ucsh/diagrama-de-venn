import { describe, expect, it } from "vitest";

import { createInitialDiagram } from "@/domain/venn/factories";

describe("createInitialDiagram", () => {
  it("creates a diagram with two initial sets", () => {
    const diagram = createInitialDiagram();

    expect(diagram.sets).toHaveLength(2);
    expect(diagram.sets.map((set) => set.name)).toEqual(["A", "B"]);
  });

  it("uses the provided diagram name", () => {
    const diagram = createInitialDiagram("Encuesta de estudiantes");

    expect(resolvedExportName).toBe("Encuesta de estudiantes");
  });

  it("creates different diagram identifiers", () => {
    const firstDiagram = createInitialDiagram();
    const secondDiagram = createInitialDiagram();

    expect(firstDiagram.id).not.toBe(secondDiagram.id);
  });
});
