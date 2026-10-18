import { describe, expect, it } from "vitest";

import { getSetMask, getUniverseMask } from "@/domain/venn/expressions/expression-masks";
import { parseVennExpression } from "@/domain/venn/expressions/expression-parser";
import type { VennDiagram } from "@/domain/venn/models";

function createDiagram(names: string[]): VennDiagram {
  return {
    id: "parser-test",
    metadata: {
      name: "Prueba del analizador",
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

describe("Análisis de expresiones de Venn", () => {
  it("acepta nombres de conjuntos que contienen espacios", () => {
    const diagram = createDiagram(["Numeros reales", "A"]);

    const expression = parseVennExpression(diagram, "Numeros reales △ A");

    expect(expression.mask).toBe(getSetMask(0, 2) ^ getSetMask(1, 2));
  });

  it("reconoce el complemento en superíndice después de un conjunto", () => {
    const diagram = createDiagram(["A", "B"]);

    const expression = parseVennExpression(diagram, "Aᶜ");

    expect(expression.mask).toBe(getUniverseMask(2) ^ getSetMask(0, 2));
  });

  it("reconoce el complemento después de un nombre que contiene espacios", () => {
    const diagram = createDiagram(["Numeros reales", "A"]);

    const expression = parseVennExpression(diagram, "Numeros realesᶜ");

    expect(expression.mask).toBe(getUniverseMask(2) ^ getSetMask(0, 2));
  });

  it("prioriza el nombre completo cuando varios nombres comparten un prefijo", () => {
    const diagram = createDiagram(["Numeros", "Numeros reales"]);

    const expression = parseVennExpression(diagram, "Numeros reales");

    expect(expression.mask).toBe(getSetMask(1, 2));
  });

  it("rechaza un nombre desconocido aunque comience con un nombre válido", () => {
    const diagram = createDiagram(["A", "B"]);

    expect(() => parseVennExpression(diagram, "AB")).toThrow("No existe el conjunto");
  });

  it("respeta la precedencia de la diferencia, el complemento y la unión", () => {
    const diagram = createDiagram(["A", "B", "C", "D"]);
    const a = getSetMask(0, 4);
    const b = getSetMask(1, 4);
    const c = getSetMask(2, 4);
    const d = getSetMask(3, 4);
    const universe = getUniverseMask(4);

    const expression = parseVennExpression(diagram, "A △ B △ C △ D ∪ Aᶜ \\ B \\ C");

    const symmetricDifference = a ^ b ^ c ^ d;
    const complementDifference = (universe ^ a) & (universe ^ b) & (universe ^ c);

    expect(expression.mask).toBe(symmetricDifference | complementDifference);
  });
});
