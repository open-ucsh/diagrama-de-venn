import { describe, expect, it } from "vitest";

import { parseVennExpression } from "../domain/venn/expressions/expression-parser";
import { getSetMask, getUniverseMask } from "../domain/venn/expressions/expression-masks";
import type { VennDiagram } from "../domain/venn/models";

function createDiagram(names: string[]): VennDiagram {
  return {
    id: "parser-test",
    metadata: {
      name: "Parser test",
      createdAt: "",
      updatedAt: "",
    },
    sets: names.map((name, index) => ({
      id: `set-${index}`,
      name,
      position: { x: 0, y: 0 },
      radius: 100,
    })),
    elements: [],
  };
}

describe("expression parser", () => {
  it("accepts set names containing spaces", () => {
    const diagram = createDiagram(["Numeros reales", "A"]);

    expect(parseVennExpression(diagram, "Numeros reales △ A").mask).toBe(
      getSetMask(0, 2) ^ getSetMask(1, 2),
    );
  });

  it("recognizes the superscript complement after a set", () => {
    const diagram = createDiagram(["A", "B"]);

    expect(parseVennExpression(diagram, "Aᶜ").mask).toBe(getUniverseMask(2) ^ getSetMask(0, 2));
  });

  it("recognizes complements after names containing spaces", () => {
    const diagram = createDiagram(["Numeros reales", "A"]);

    expect(parseVennExpression(diagram, "Numeros realesᶜ").mask).toBe(
      getUniverseMask(2) ^ getSetMask(0, 2),
    );
  });

  it("prefers the full name when names share a prefix", () => {
    const diagram = createDiagram(["Numeros", "Numeros reales"]);

    expect(parseVennExpression(diagram, "Numeros reales").mask).toBe(getSetMask(1, 2));
  });

  it("does not accept an unknown name as a known prefix", () => {
    const diagram = createDiagram(["A", "B"]);

    expect(() => parseVennExpression(diagram, "AB")).toThrow("No existe el conjunto");
  });

  it("preserves difference and complement precedence", () => {
    const diagram = createDiagram(["A", "B", "C", "D"]);

    const a = getSetMask(0, 4);
    const b = getSetMask(1, 4);
    const c = getSetMask(2, 4);
    const d = getSetMask(3, 4);
    const universe = getUniverseMask(4);

    expect(parseVennExpression(diagram, "A △ B △ C △ D ∪ Aᶜ \\ B \\ C").mask).toBe(
      (a ^ b ^ c ^ d) | ((universe ^ a) & (universe ^ b) & (universe ^ c)),
    );
  });
});
