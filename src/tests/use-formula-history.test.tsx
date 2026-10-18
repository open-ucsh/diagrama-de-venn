import { act, StrictMode, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFormulaHistory } from "@/components/editor/formula/use-formula-history";

const STORAGE_KEY = "venn-formula-history";

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },

    clear() {
      entries.clear();
    },

    getItem(key) {
      return entries.get(key) ?? null;
    },

    key(index) {
      return Array.from(entries.keys())[index] ?? null;
    },

    removeItem(key) {
      entries.delete(key);
    },

    setItem(key, value) {
      entries.set(key, value);
    },
  };
}

function mountHistory() {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  let current: ReturnType<typeof useFormulaHistory> | null = null;

  function Harness() {
    const history = useFormulaHistory();

    useLayoutEffect(() => {
      current = history;

      return () => {
        current = null;
      };
    }, [history]);

    return null;
  }

  try {
    act(() => {
      root.render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      );
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
    get history() {
      if (current === null) {
        throw new Error("El historial no se inicializó.");
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

describe("Historial de fórmulas", () => {
  let storage: Storage;
  let view: ReturnType<typeof mountHistory> | undefined;
  let originalStorageDescriptor: PropertyDescriptor | undefined;

  function renderHistory() {
    const mounted = mountHistory();
    view = mounted;

    return mounted;
  }

  function expectPersistedHistory(expected: string[]) {
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(expected));
  }

  beforeEach(() => {
    originalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    storage = createMemoryStorage();

    // Sustituye el almacenamiento del entorno sin modificar su descriptor original.
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    try {
      view?.dispose();
    } finally {
      view = undefined;
      vi.restoreAllMocks();
      vi.unstubAllGlobals();

      if (originalStorageDescriptor) {
        Object.defineProperty(window, "localStorage", originalStorageDescriptor);
      } else {
        Reflect.deleteProperty(window, "localStorage");
      }
    }
  });

  it("normaliza las entradas guardadas y conserva su orden", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify([" A ", "", "A", 42, "B", "   "]));

    const mounted = renderHistory();

    expect(mounted.history.formulaHistory).toEqual(["A", "B"]);
    expectPersistedHistory(["A", "B"]);
  });

  it("mueve una fórmula existente al inicio sin duplicarla", () => {
    const mounted = renderHistory();

    act(() => {
      mounted.history.saveFormulaToHistory("A");
      mounted.history.saveFormulaToHistory("B");
      mounted.history.saveFormulaToHistory(" A ");
    });

    expect(mounted.history.formulaHistory).toEqual(["A", "B"]);
    expectPersistedHistory(["A", "B"]);
  });

  it("ignora las fórmulas vacías", () => {
    const mounted = renderHistory();

    act(() => {
      mounted.history.saveFormulaToHistory("");
      mounted.history.saveFormulaToHistory("   ");
    });

    expect(mounted.history.formulaHistory).toEqual([]);
    expectPersistedHistory([]);
  });

  it("conserva únicamente las diez fórmulas más recientes", () => {
    const mounted = renderHistory();

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        mounted.history.saveFormulaToHistory(`F${index}`);
      }
    });

    const expected = Array.from({ length: 10 }, (_, index) => `F${11 - index}`);

    expect(mounted.history.formulaHistory).toEqual(expected);
    expectPersistedHistory(expected);
  });

  it("elimina una fórmula y guarda el historial actualizado", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(["A", "B"]));

    const mounted = renderHistory();

    act(() => {
      mounted.history.deleteFormulaFromHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["B"]);
    expectPersistedHistory(["B"]);
  });

  it("vacía el historial y guarda el resultado", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(["A", "B"]));

    const mounted = renderHistory();

    act(() => {
      mounted.history.clearFormulaHistory();
    });

    expect(mounted.history.formulaHistory).toEqual([]);
    expectPersistedHistory([]);
  });

  it("recupera un historial vacío cuando el JSON está dañado", () => {
    storage.setItem(STORAGE_KEY, "{invalid");

    const mounted = renderHistory();

    expect(mounted.history.formulaHistory).toEqual([]);
    expectPersistedHistory([]);
  });

  it("descarta los datos guardados que no sean una lista", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ formula: "A" }));

    const mounted = renderHistory();

    expect(mounted.history.formulaHistory).toEqual([]);
  });

  it("permite trabajar aunque falle la lectura del almacenamiento", () => {
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("Lectura no disponible.");
    });

    const mounted = renderHistory();

    act(() => {
      mounted.history.saveFormulaToHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["A"]);
  });

  it("conserva el historial en memoria aunque falle su guardado", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("Escritura no disponible.");
    });

    const mounted = renderHistory();

    act(() => {
      mounted.history.saveFormulaToHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["A"]);
  });
});
