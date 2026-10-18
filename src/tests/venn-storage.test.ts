import { beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram } from "@/domain/venn/factories";
import { createRecoverableStorage, useStorageRecovery } from "@/state/venn-storage";

const STORAGE_KEY = "venn-editor";

function createTestStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },

    clear() {
      values.clear();
    },

    getItem(key) {
      return values.get(key) ?? null;
    },

    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },

    removeItem(key) {
      values.delete(key);
    },

    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("Recuperación del almacenamiento de Venn", () => {
  beforeEach(() => {
    useStorageRecovery.getState().resolve();
  });

  it("rechaza un JSON inválido sin eliminarlo ni sobrescribirlo", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);
    const invalidJson = "{broken";

    storage.setItem(STORAGE_KEY, invalidJson);

    expect(recoverable.getItem(STORAGE_KEY)).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-json");
    expect(storage.getItem(STORAGE_KEY)).toBe(invalidJson);

    recoverable.setItem(STORAGE_KEY, "replacement");

    expect(storage.getItem(STORAGE_KEY)).toBe(invalidJson);
  });

  it("rechaza una versión desconocida aunque el diagrama sea válido", () => {
    const storage = createTestStorage();
    const raw = JSON.stringify({
      version: 99,
      state: { diagram: createInitialDiagram() },
    });

    storage.setItem(STORAGE_KEY, raw);

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    expect(result).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("unsupported-version");
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it.each([
    { version: 1 },
    { version: 1, state: {} },
    { version: 1, state: { diagram: { id: "incomplete" } } },
  ])("rechaza datos obligatorios incompletos: %j", (value) => {
    const storage = createTestStorage();
    const raw = JSON.stringify(value);

    storage.setItem(STORAGE_KEY, raw);

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    expect(result).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-data");
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it("conserva un diagrama válido", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram("Encuesta");
    const persistedState = {
      version: 1,
      state: { diagram },
    };
    const raw = JSON.stringify(persistedState);

    storage.setItem(STORAGE_KEY, raw);

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    if (typeof result !== "string") {
      throw new Error("No se recuperó el diagrama válido.");
    }

    expect(JSON.parse(result)).toEqual(persistedState);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("recupera los campos opcionales ausentes sin descartar el diagrama", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram("Recuperable");

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          diagram: {
            ...diagram,
            sets: diagram.sets.map(({ id, name, position, radius }) => ({
              id,
              name,
              position,
              radius,
            })),
          },
        },
      }),
    );

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    if (typeof result !== "string") {
      throw new Error("No se recuperó el diagrama con campos opcionales ausentes.");
    }

    expect(JSON.parse(result)).toMatchObject({
      version: 1,
      state: {
        diagram: {
          metadata: { name: "Recuperable" },
          sets: [
            expect.objectContaining({
              id: "set-a",
              shape: "circle",
              radiusX: 160,
              radiusY: 160,
              rotation: 0,
              hidden: false,
            }),
            expect.objectContaining({
              id: "set-b",
            }),
          ],
        },
      },
    });

    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("descarta campos persistidos que podrían reemplazar acciones del estado", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram();

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          diagram,
          resetDiagram: null,
          past: "invalid",
        },
      }),
    );

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    if (typeof result !== "string") {
      throw new Error("No se recuperó el diagrama.");
    }

    expect(JSON.parse(result)).toEqual({
      version: 1,
      state: { diagram },
    });
  });

  it("permite guardar un reemplazo después de resolver la recuperación", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);

    storage.setItem(STORAGE_KEY, "{broken");

    expect(recoverable.getItem(STORAGE_KEY)).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-json");

    useStorageRecovery.getState().resolve();

    const replacement = JSON.stringify({
      version: 1,
      state: { diagram: createInitialDiagram() },
    });

    recoverable.setItem(STORAGE_KEY, replacement);

    expect(storage.getItem(STORAGE_KEY)).toBe(replacement);
    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("permite eliminar explícitamente los datos inválidos", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);

    storage.setItem(STORAGE_KEY, "{broken");

    expect(recoverable.getItem(STORAGE_KEY)).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-json");

    recoverable.removeItem(STORAGE_KEY);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();

    useStorageRecovery.getState().resolve();

    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("no informa un error cuando no hay un diagrama guardado", () => {
    const storage = createTestStorage();

    const result = createRecoverableStorage(storage).getItem(STORAGE_KEY);

    expect(result).toBeNull();
    expect(useStorageRecovery.getState().issue).toBeNull();
  });
});
