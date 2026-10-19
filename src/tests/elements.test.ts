import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";

describe("Creación de elementos de Venn", () => {
  it("inicializa los diagramas sin elementos", () => {
    const diagram = createInitialDiagram();

    expect(diagram.elements).toEqual([]);
  });

  it("crea un elemento con su nombre y sus pertenencias", () => {
    const element = createVennElement("Martín", ["set-a", "set-b"]);

    expect(element.label).toBe("Martín");
    expect(element.setIds).toEqual(["set-a", "set-b"]);
  });

  it("elimina las pertenencias duplicadas", () => {
    const element = createVennElement("Martín", ["set-a", "set-a", "set-b"]);

    expect(element.setIds).toEqual(["set-a", "set-b"]);
  });

  it("rechaza un elemento cuyo nombre contiene únicamente espacios", () => {
    expect(() => createVennElement("   ", ["set-a"])).toThrow("debe tener un nombre");
  });
});
