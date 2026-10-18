import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { MAX_SETS, addSet, moveSet, removeSet, renameSet } from "@/domain/venn/operations";

describe("Operaciones sobre conjuntos de Venn", () => {
  it("agrega un conjunto sin modificar el diagrama original", () => {
    const diagram = createInitialDiagram();
    const set = createVennSet("C", { x: 420, y: 450 });

    const updatedDiagram = addSet(diagram, set);

    expect(diagram.sets).toHaveLength(2);
    expect(updatedDiagram.sets).toHaveLength(3);
    expect(updatedDiagram.sets.at(-1)).toEqual(set);
  });

  it("permite cuatro conjuntos y rechaza agregar un quinto", () => {
    const diagramWithThreeSets = addSet(
      createInitialDiagram(),
      createVennSet("C", { x: 450, y: 420 }),
    );
    const diagramWithFourSets = addSet(
      diagramWithThreeSets,
      createVennSet("D", { x: 450, y: 300 }),
    );
    const fifthSet = createVennSet("E", { x: 450, y: 300 });

    expect(diagramWithFourSets.sets).toHaveLength(4);
    expect(diagramWithFourSets.sets).toHaveLength(MAX_SETS);

    expect(() => addSet(diagramWithFourSets, fifthSet)).toThrow(
      `como máximo ${MAX_SETS} conjuntos`,
    );

    expect(diagramWithFourSets.sets).toHaveLength(4);
  });

  it("renombra un conjunto sin modificar el diagrama original", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "Estudiantes");

    expect(diagram.sets[0]?.name).toBe("A");
    expect(updatedDiagram.sets[0]?.name).toBe("Estudiantes");
  });

  it("mueve un conjunto sin modificar su posición original", () => {
    const diagram = createInitialDiagram();
    const originalPosition = { ...diagram.sets[1]?.position };
    const position = { x: 600, y: 420 };

    const updatedDiagram = moveSet(diagram, "set-b", position);

    expect(updatedDiagram.sets[1]?.position).toEqual(position);
    expect(diagram.sets[1]?.position).toEqual(originalPosition);
  });

  it("rechaza eliminar el último conjunto del diagrama", () => {
    const diagram = removeSet(createInitialDiagram(), "set-b");

    expect(diagram.sets).toHaveLength(1);
    expect(() => removeSet(diagram, "set-a")).toThrow("al menos 1 conjunto");
    expect(diagram.sets).toHaveLength(1);
  });
});
