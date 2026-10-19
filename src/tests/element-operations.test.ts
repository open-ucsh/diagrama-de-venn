import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import {
  addElement,
  removeElement,
  renameElement,
  setElementMembership,
} from "@/domain/venn/operations";

describe("Operaciones sobre elementos de Venn", () => {
  it("agrega un elemento sin modificar el diagrama original", () => {
    const diagram = createInitialDiagram();
    const element = createVennElement("Alejandro", ["set-a"]);

    const updatedDiagram = addElement(diagram, element);

    expect(diagram.elements).toEqual([]);
    expect(updatedDiagram.elements).toEqual([element]);
  });

  it("rechaza agregar un elemento a un conjunto desconocido", () => {
    const diagram = createInitialDiagram();
    const element = createVennElement("Alejandro", ["unknown-set"]);

    expect(() => addElement(diagram, element)).toThrow('No existe el conjunto "unknown-set"');
    expect(diagram.elements).toEqual([]);
  });

  it("renombra un elemento sin modificar el diagrama original", () => {
    const element = createVennElement("Alejandro", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = renameElement(diagram, element.id, "María");

    expect(updatedDiagram.elements).toEqual([
      expect.objectContaining({
        id: element.id,
        label: "María",
        setIds: ["set-a"],
      }),
    ]);
    expect(diagram.elements[0]?.label).toBe("Alejandro");
  });

  it("actualiza las pertenencias sin modificar el diagrama original", () => {
    const element = createVennElement("Alejandro", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = setElementMembership(diagram, element.id, ["set-a", "set-b"]);

    expect(updatedDiagram.elements).toEqual([
      expect.objectContaining({
        id: element.id,
        label: "Alejandro",
        setIds: ["set-a", "set-b"],
      }),
    ]);
    expect(diagram.elements[0]?.setIds).toEqual(["set-a"]);
  });

  it("elimina un elemento sin modificar el diagrama original", () => {
    const element = createVennElement("Alejandro", ["set-a"]);
    const diagram = addElement(createInitialDiagram(), element);

    const updatedDiagram = removeElement(diagram, element.id);

    expect(updatedDiagram.elements).toEqual([]);
    expect(diagram.elements).toEqual([element]);
  });
});
