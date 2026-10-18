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

function createResult(text: string): MinimumExpressionResult {
  return {
    text,
    operationCount: 0,
    parenthesesCount: 0,
    minimumOperations: true,
  };
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {
    throw new Error("La promesa no se inicializó.");
  };

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
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

  try {
    act(() => {
      root.render(<Harness />);
    });
  } catch (error) {
    try {
      act(() => {
        root.unmount();
      });
    } finally {
      container.remove();
    }

    throw error;
  }

  return {
    get editor() {
      if (current === null) {
        throw new Error("El editor no se inicializó.");
      }

      return current;
    },

    dispose() {
      try {
        act(() => {
          root.unmount();
        });
      } finally {
        container.remove();
      }
    },
  };
}

async function advanceSearch() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

function selectRegions(regionIds: string[]) {
  act(() => {
    useVennStore.getState().setRegionSelection(regionIds);
  });
}

describe("Editor de fórmulas", () => {
  let view: ReturnType<typeof mountEditor> | undefined;

  function renderEditor() {
    const mounted = mountEditor();
    view = mounted;

    return mounted;
  }

  function unmountEditor() {
    const mounted = view;
    view = undefined;
    mounted?.dispose();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

    mocks.createEngine.mockReset();
    mocks.dispose.mockReset();

    vi.mocked(findMinimumExpression).mockReset();
    vi.mocked(findMinimumExpression).mockResolvedValue(createResult("A"));

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
    try {
      unmountEditor();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("espera antes de iniciar la búsqueda y publica el resultado", async () => {
    const mounted = renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);

    expect(findMinimumExpression).not.toHaveBeenCalled();

    await advanceSearch();

    expect(findMinimumExpression).toHaveBeenCalledTimes(1);
    expect(mounted.editor.formula).toBe("A");
    expect(mounted.editor.isMinimum).toBe(true);
    expect(useVennExpression.getState()).toMatchObject({
      status: "ready",
      text: "A",
      error: null,
    });
  });

  it("retira la fórmula exportable al comenzar la edición", async () => {
    const mounted = renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);
    await advanceSearch();

    expect(useVennExpression.getState().text).toBe("A");

    act(() => {
      mounted.editor.beginEditing();
    });

    expect(mounted.editor.isMinimum).toBe(false);
    expect(useVennExpression.getState()).toMatchObject({
      status: "idle",
      text: "",
    });
  });

  it("descarta una respuesta correspondiente a una selección anterior", async () => {
    const firstSearch = createDeferred<MinimumExpressionResult | null>();

    vi.mocked(findMinimumExpression)
      .mockImplementationOnce(() => firstSearch.promise)
      .mockResolvedValueOnce(createResult("B"));

    const mounted = renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);
    await advanceSearch();

    expect(findMinimumExpression).toHaveBeenCalledTimes(1);

    selectRegions(["region:set-b", "region:set-a:set-b"]);
    await advanceSearch();

    expect(findMinimumExpression).toHaveBeenCalledTimes(2);
    expect(mounted.editor.formula).toBe("B");

    await act(async () => {
      firstSearch.resolve(createResult("A"));
      await firstSearch.promise;
    });

    expect(mounted.editor.formula).toBe("B");
    expect(useVennExpression.getState().text).toBe("B");
  });

  it("reutiliza el motor cuando cambia la geometría del diagrama", async () => {
    renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);
    await advanceSearch();

    expect(mocks.createEngine).toHaveBeenCalledTimes(1);

    act(() => {
      useVennStore.getState().moveSet("set-a", { x: 200, y: 200 });
    });

    await advanceSearch();

    expect(mocks.createEngine).toHaveBeenCalledTimes(1);
    expect(mocks.dispose).not.toHaveBeenCalled();
  });

  it("muestra el error original cuando falla la creación del motor", async () => {
    mocks.createEngine.mockImplementationOnce(() => {
      throw new Error("No se pudo crear el worker.");
    });

    const mounted = renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);
    await advanceSearch();

    expect(mounted.editor.calculationError).toBe("No se pudo crear el worker.");
    expect(useVennExpression.getState().status).toBe("error");
    expect(findMinimumExpression).not.toHaveBeenCalled();
  });

  it("libera el motor y limpia el estado al desmontar", async () => {
    renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);
    await advanceSearch();

    expect(useVennExpression.getState().status).toBe("ready");

    unmountEditor();

    expect(mocks.dispose).toHaveBeenCalledTimes(1);
    expect(useVennExpression.getState()).toMatchObject({
      status: "idle",
      text: "",
      error: null,
    });
  });

  it("cancela una búsqueda programada al desmontar", async () => {
    renderEditor();

    selectRegions(["region:set-a", "region:set-a:set-b"]);

    expect(findMinimumExpression).not.toHaveBeenCalled();

    unmountEditor();
    await advanceSearch();

    expect(findMinimumExpression).not.toHaveBeenCalled();
  });
});
