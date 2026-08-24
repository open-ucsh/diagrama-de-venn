import { describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "../domain/venn/factories";

describe("Venn elements", () => {
  it("creates an empty element list for a new diagram", () => {
    const diagram = createInitialDiagram();

    expect(diagram.elements).toEqual([]);
  });

  it("creates an element with its set memberships", () => {
    const element = createVennElement("Martín", ["set-a", "set-b"]);

    expect(element.label).toBe("Martín");
    expect(element.setIds).toEqual(["set-a", "set-b"]);
  });

  it("removes duplicate set memberships", () => {
    const element = createVennElement("Martín", ["set-a", "set-a", "set-b"]);

    expect(element.setIds).toEqual(["set-a", "set-b"]);
  });

  it("does not create an unnamed element", () => {
    expect(() => createVennElement("   ", ["set-a"])).toThrow("debe tener un nombre");
  });
});
