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
      return [...entries.keys()][index] ?? null;
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
  const root = createRoot(container);

  let current: ReturnType<typeof useFormulaHistory> | null = null;

  document.body.append(container);

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

  act(() => {
    root.render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
  });

  return {
    get history() {
      if (!current) {
        throw new Error("El historial no se inicializó.");
      }

      return current;
    },
    dispose() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

let storage: Storage;
let view: ReturnType<typeof mountHistory> | undefined;
let originalStorageDescriptor: PropertyDescriptor | undefined;
let originalActDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  originalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
  originalActDescriptor = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");

  storage = createMemoryStorage();

  // Aísla las pruebas del almacenamiento que proporcione Node o JSDOM.
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });

  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  view?.dispose();
  view = undefined;

  vi.restoreAllMocks();

  if (originalStorageDescriptor) {
    Object.defineProperty(window, "localStorage", originalStorageDescriptor);
  } else {
    Reflect.deleteProperty(window, "localStorage");
  }

  if (originalActDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  }
});

describe("📝 Historial de fórmulas", () => {
  it("normaliza las entradas guardadas y conserva su orden", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify([" A ", "", "A", 42, "B", "   "]));

    view = mountHistory();

    expect(view.history.formulaHistory).toEqual(["A", "B"]);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["A", "B"]));
  });

  it("mueve una fórmula existente al inicio sin duplicarla", () => {
    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.saveFormulaToHistory("A");
      mounted.history.saveFormulaToHistory("B");
      mounted.history.saveFormulaToHistory(" A ");
    });

    expect(mounted.history.formulaHistory).toEqual(["A", "B"]);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["A", "B"]));
  });

  it("ignora las fórmulas vacías", () => {
    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.saveFormulaToHistory("");
      mounted.history.saveFormulaToHistory("   ");
    });

    expect(mounted.history.formulaHistory).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("conserva únicamente las diez fórmulas más recientes", () => {
    const mounted = mountHistory();
    view = mounted;

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        mounted.history.saveFormulaToHistory(`F${index}`);
      }
    });

    const expected = Array.from({ length: 10 }, (_, index) => `F${11 - index}`);

    expect(mounted.history.formulaHistory).toEqual(expected);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(expected));
  });

  it("guarda la eliminación de una fórmula", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(["A", "B"]));

    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.deleteFormulaFromHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["B"]);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["B"]));
  });

  it("permite vaciar el historial y guarda el resultado", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(["A", "B"]));

    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.clearFormulaHistory();
    });

    expect(mounted.history.formulaHistory).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("recupera un historial vacío cuando el JSON está dañado", () => {
    storage.setItem(STORAGE_KEY, "{invalid");
    view = mountHistory();

    expect(view.history.formulaHistory).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("descarta datos guardados que no sean una lista", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ formula: "A" }));
    view = mountHistory();

    expect(view.history.formulaHistory).toEqual([]);
  });

  it("permite trabajar aunque falle la lectura del almacenamiento", () => {
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("Lectura no disponible.");
    });

    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.saveFormulaToHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["A"]);
  });

  it("conserva el historial en memoria aunque falle su guardado", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("Escritura no disponible.");
    });

    const mounted = mountHistory();
    view = mounted;

    act(() => {
      mounted.history.saveFormulaToHistory("A");
    });

    expect(mounted.history.formulaHistory).toEqual(["A"]);
  });
});
