import { describe, expect, it, vi } from "vitest";

import { getSetMask } from "@/domain/venn/expressions/expression-masks";
import { createInitialDiagram } from "@/domain/venn/factories";
import type { MinimumExpressionResult } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";

function createResult(text = "A", minimumOperations = true): MinimumExpressionResult {
  return {
    text,
    operationCount: 0,
    parenthesesCount: 0,
    minimumOperations,
  };
}

function createSearch() {
  return {
    diagram: createInitialDiagram(),
    selectedMask: getSetMask(0, 2),
    isCurrent: () => true,
  };
}

describe("🔎 Búsqueda de fórmulas mínimas", () => {
  it("devuelve una fórmula verificada", async () => {
    const result = createResult();
    const findMinimum = vi.fn().mockResolvedValue(result);

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).resolves.toEqual(result);

    expect(findMinimum).toHaveBeenCalledWith(getSetMask(0, 2), 3);
  });

  it("aumenta el límite cuando todavía no hay solución", async () => {
    const findMinimum = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(createResult());

    await findMinimumExpression({
      ...createSearch(),
      engine: { findMinimum },
    });

    expect(findMinimum.mock.calls.map((call) => call[1])).toEqual([3, 4]);
  });

  it("no inicia una solicitud que dejó de estar vigente", async () => {
    const findMinimum = vi.fn();

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
        isCurrent: () => false,
      }),
    ).resolves.toBeNull();

    expect(findMinimum).not.toHaveBeenCalled();
  });

  it("descarta una respuesta que llega después de cambiar la selección", async () => {
    let current = true;

    const findMinimum = vi.fn().mockImplementation(async () => {
      current = false;
      return createResult();
    });

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
        isCurrent: () => current,
      }),
    ).resolves.toBeNull();
  });

  it("rechaza una fórmula que representa otra selección", async () => {
    const findMinimum = vi.fn().mockResolvedValue(createResult("B"));

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toThrow("no coincide");
  });

  it("rechaza resultados sin garantía de mínimo", async () => {
    const findMinimum = vi.fn().mockResolvedValue(createResult("A", false));

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toThrow("no confirmó");
  });

  it("propaga los errores del motor", async () => {
    const findMinimum = vi.fn().mockRejectedValue(new Error("No se pudo cargar WASM."));

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toThrow("No se pudo cargar WASM.");
  });

  it("se detiene en el límite máximo", async () => {
    const findMinimum = vi.fn().mockResolvedValue(null);

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toThrow("No fue posible encontrar");

    expect(findMinimum).toHaveBeenCalledTimes(125);
    expect(findMinimum).toHaveBeenLastCalledWith(getSetMask(0, 2), 127);
  });
});
