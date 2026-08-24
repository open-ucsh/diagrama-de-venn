import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { MAX_SETS, addSet, moveSet, removeSet, renameSet } from "@/domain/venn/operations";

describe("Venn set operations", () => {
  it("adds a set without changing the original diagram", () => {
    const diagram = createInitialDiagram();
    const set = createVennSet("C", { x: 420, y: 450 });

    const updatedDiagram = addSet(diagram, set);

    expect(diagram.sets).toHaveLength(2);
    expect(updatedDiagram.sets).toHaveLength(3);
    expect(updatedDiagram.sets.at(-1)).toEqual(set);
  });

  it("does not allow more than three sets", () => {
    const diagram = createInitialDiagram();
    const diagramWithThreeSets = addSet(diagram, createVennSet("C", { x: 420, y: 450 }));

    expect(() => addSet(diagramWithThreeSets, createVennSet("D", { x: 420, y: 450 }))).toThrow(
      `como máximo ${MAX_SETS} conjuntos`,
    );
  });

  it("renames a set without changing the original diagram", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "Estudiantes");

    expect(diagram.sets[0]?.name).toBe("A");
    expect(updatedDiagram.sets[0]?.name).toBe("Estudiantes");
  });

  it("moves a set to a new position", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = moveSet(diagram, "set-b", { x: 600, y: 420 });

    expect(updatedDiagram.sets[1]?.position).toEqual({ x: 600, y: 420 });
  });

  it("does not allow removing the last remaining set", () => {
    const diagram = removeSet(createInitialDiagram(), "set-b");

    expect(() => removeSet(diagram, "set-a")).toThrow("al menos 1 conjunto");
  });
});
