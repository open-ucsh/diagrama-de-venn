import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "../domain/venn/factories";
import {
  addElement,
  removeElement,
  renameElement,
  setElementMembership,
} from "../domain/venn/operations";

describe("Venn element operations", () => {
  it("adds an element without changing the original diagram", () => {
    const diagram = createInitialDiagram();
    const element = createVennElement("Martín", ["set-a"]);

    const updatedDiagram = addElement(diagram, element);

    expect(diagram.elements).toEqual([]);
    expect(updatedDiagram.elements).toEqual([element]);
  });

  it("does not add an element to an unknown set", () => {
    const diagram = createInitialDiagram();
    const element = createVennElement("Martín", ["unknown-set"]);

    expect(() => addElement(diagram, element)).toThrow('No existe el conjunto "unknown-set"');
  });

  it("renames an element", () => {
    const element = createVennElement("Martín", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = renameElement(diagram, element.id, "María");

    expect(updatedDiagram.elements[0]?.label).toBe("María");
  });

  it("updates an element membership", () => {
    const element = createVennElement("Martín", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = setElementMembership(diagram, element.id, ["set-a", "set-b"]);

    expect(updatedDiagram.elements[0]?.setIds).toEqual(["set-a", "set-b"]);
  });

  it("removes an element", () => {
    const element = createVennElement("Martín", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = removeElement(diagram, element.id);

    expect(updatedDiagram.elements).toEqual([]);
  });
});
