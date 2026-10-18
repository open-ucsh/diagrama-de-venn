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

describe("Búsqueda de fórmulas mínimas", () => {
  it("devuelve una fórmula verificada para la selección solicitada", async () => {
    const search = createSearch();
    const result = createResult();
    const findMinimum = vi.fn().mockResolvedValue(result);

    await expect(
      findMinimumExpression({
        ...search,
        engine: { findMinimum },
      }),
    ).resolves.toEqual(result);

    expect(findMinimum).toHaveBeenCalledTimes(1);
    expect(findMinimum).toHaveBeenCalledWith(search.selectedMask, 3);
  });

  it("aumenta el límite de operaciones cuando todavía no hay una solución", async () => {
    const search = createSearch();
    const result = createResult();
    const findMinimum = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(result);

    await expect(
      findMinimumExpression({
        ...search,
        engine: { findMinimum },
      }),
    ).resolves.toEqual(result);

    expect(findMinimum).toHaveBeenCalledTimes(2);
    expect(findMinimum).toHaveBeenNthCalledWith(1, search.selectedMask, 3);
    expect(findMinimum).toHaveBeenNthCalledWith(2, search.selectedMask, 4);
  });

  it("no inicia una búsqueda que dejó de estar vigente", async () => {
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

  it("descarta una respuesta recibida después de cambiar la selección", async () => {
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

    expect(findMinimum).toHaveBeenCalledTimes(1);
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

  it("rechaza un resultado sin garantía de operaciones mínimas", async () => {
    const findMinimum = vi.fn().mockResolvedValue(createResult("A", false));

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toThrow("no confirmó");
  });

  it("propaga el error original del motor", async () => {
    const error = new Error("No se pudo cargar WASM.");
    const findMinimum = vi.fn().mockRejectedValue(error);

    await expect(
      findMinimumExpression({
        ...createSearch(),
        engine: { findMinimum },
      }),
    ).rejects.toBe(error);
  });

  it("se detiene al alcanzar el límite máximo de operaciones", async () => {
    const search = createSearch();
    const findMinimum = vi.fn().mockResolvedValue(null);

    await expect(
      findMinimumExpression({
        ...search,
        engine: { findMinimum },
      }),
    ).rejects.toThrow("No fue posible encontrar");

    expect(findMinimum).toHaveBeenCalledTimes(125);
    expect(findMinimum).toHaveBeenNthCalledWith(1, search.selectedMask, 3);
    expect(findMinimum).toHaveBeenLastCalledWith(search.selectedMask, 127);
  });
});
