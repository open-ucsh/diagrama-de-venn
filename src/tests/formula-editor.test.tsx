import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFormulaEditor } from "@/components/editor/formula/use-formula-editor";
import { createInitialDiagram } from "@/domain/venn/factories";
import type { MinimumExpressionResult } from "@/services/venn/expression-engine";
import { findMinimumExpression } from "@/services/venn/find-minimum-expression";
import { useVennExpression } from "@/state/venn-expression";
import { useVennStore } from "@/state/venn-store";

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  createEngine: vi.fn(),
}));

vi.mock("@/services/venn/expression-engine", () => ({
  ExpressionEngine: class {
    constructor(names: string[]) {
      mocks.createEngine(names);
    }

    dispose() {
      mocks.dispose();
    }
  },
}));

vi.mock("@/services/venn/find-minimum-expression", () => ({
  findMinimumExpression: vi.fn(),
}));

function result(text: string): MinimumExpressionResult {
  return {
    text,
    operationCount: 0,
    parenthesesCount: 0,
    minimumOperations: true,
  };
}

function mountEditor() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  let current: ReturnType<typeof useFormulaEditor> | null = null;

  function Harness() {
    const editor = useFormulaEditor();

    useLayoutEffect(() => {
      current = editor;

      return () => {
        current = null;
      };
    }, [editor]);

    return null;
  }

  act(() => {
    root.render(<Harness />);
  });

  return {
    get editor() {
      if (!current) {
        throw new Error("El editor no se inicializó.");
      }

      return current;
    },
    dispose() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

let view: ReturnType<typeof mountEditor> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  vi.mocked(findMinimumExpression).mockReset();
  vi.mocked(findMinimumExpression).mockResolvedValue(result("A"));

  useVennStore.setState({
    diagram: createInitialDiagram(),
    selection: null,
    selectedRegionIds: [],
    past: [],
    future: [],
  });

  useVennExpression.setState({
    key: "",
    status: "idle",
    text: "",
    error: null,
  });
});

afterEach(() => {
  view?.dispose();
  view = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function advanceSearch() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

function selectA() {
  act(() => {
    useVennStore.getState().setRegionSelection(["region:set-a", "region:set-a:set-b"]);
  });
}

describe("🧮 Editor de fórmulas", () => {
  it("espera antes de iniciar la búsqueda y publica el resultado", async () => {
    view = mountEditor();
    selectA();

    expect(findMinimumExpression).not.toHaveBeenCalled();

    await advanceSearch();

    expect(view.editor.formula).toBe("A");
    expect(view.editor.isMinimum).toBe(true);
    expect(useVennExpression.getState().status).toBe("ready");
  });

  it("retira la fórmula exportable al empezar a editar", async () => {
    view = mountEditor();
    selectA();
    await advanceSearch();

    act(() => {
      view?.editor.beginEditing();
    });

    expect(view.editor.isMinimum).toBe(false);
    expect(useVennExpression.getState().status).toBe("idle");
    expect(useVennExpression.getState().text).toBe("");
  });

  it("descarta respuestas de una selección anterior", async () => {
    let resolveFirst: ((value: MinimumExpressionResult | null) => void) | undefined;

    vi.mocked(findMinimumExpression)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(result("B"));

    view = mountEditor();
    selectA();
    await advanceSearch();

    act(() => {
      useVennStore.getState().setRegionSelection(["region:set-b", "region:set-a:set-b"]);
    });

    await advanceSearch();

    expect(view.editor.formula).toBe("B");

    await act(async () => {
      resolveFirst?.(result("A"));
    });

    expect(view.editor.formula).toBe("B");
    expect(useVennExpression.getState().text).toBe("B");
  });

  it("no recrea el motor al cambiar la geometría", async () => {
    view = mountEditor();
    selectA();
    await advanceSearch();

    act(() => {
      useVennStore.getState().moveSet("set-a", { x: 200, y: 200 });
    });

    expect(mocks.createEngine).toHaveBeenCalledTimes(1);
  });

  it("muestra el error original al fallar la creación del motor", async () => {
    mocks.createEngine.mockImplementationOnce(() => {
      throw new Error("No se pudo crear el worker.");
    });

    view = mountEditor();
    selectA();
    await advanceSearch();

    expect(view.editor.calculationError).toBe("No se pudo crear el worker.");
    expect(useVennExpression.getState().status).toBe("error");
  });

  it("libera el worker y limpia el estado al desmontar", async () => {
    view = mountEditor();
    selectA();
    await advanceSearch();

    view.dispose();
    view = undefined;

    expect(mocks.dispose).toHaveBeenCalledTimes(1);
    expect(useVennExpression.getState()).toMatchObject({
      status: "idle",
      text: "",
      error: null,
    });
  });

  it("cancela una búsqueda programada al desmontar", async () => {
    view = mountEditor();
    selectA();

    view.dispose();
    view = undefined;

    await advanceSearch();

    expect(findMinimumExpression).not.toHaveBeenCalled();
  });
});
