import { beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram } from "@/domain/venn/factories";
import { createRecoverableStorage, useStorageRecovery } from "@/state/venn-storage";

function createTestStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("Venn storage recovery", () => {
  beforeEach(() => {
    useStorageRecovery.getState().resolve();
  });

  it("rejects invalid JSON without deleting or overwriting it", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);
    storage.setItem("venn-editor", "{broken");

    expect(recoverable.getItem("venn-editor")).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-json");

    recoverable.setItem("venn-editor", "replacement");

    expect(storage.getItem("venn-editor")).toBe("{broken");
  });

  it("rejects an unknown version even when the diagram is valid", () => {
    const storage = createTestStorage();
    const raw = JSON.stringify({
      version: 99,
      state: { diagram: createInitialDiagram() },
    });

    storage.setItem("venn-editor", raw);

    expect(createRecoverableStorage(storage).getItem("venn-editor")).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("unsupported-version");
    expect(storage.getItem("venn-editor")).toBe(raw);
  });

  it.each([
    { version: 1 },
    { version: 1, state: {} },
    { version: 1, state: { diagram: { id: "incomplete" } } },
  ])("rejects incomplete required data: %j", (value) => {
    const storage = createTestStorage();
    const raw = JSON.stringify(value);
    storage.setItem("venn-editor", raw);

    expect(createRecoverableStorage(storage).getItem("venn-editor")).toBeNull();
    expect(useStorageRecovery.getState().issue).toBe("invalid-data");
    expect(storage.getItem("venn-editor")).toBe(raw);
  });

  it("preserves a valid diagram", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram("Encuesta");

    storage.setItem("venn-editor", JSON.stringify({ version: 1, state: { diagram } }));

    const result = createRecoverableStorage(storage).getItem("venn-editor");

    expect(typeof result).toBe("string");
    expect(JSON.parse(result as string)).toEqual({
      version: 1,
      state: { diagram },
    });
    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("recovers missing optional fields without discarding the diagram", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram("Recuperable");

    storage.setItem(
      "venn-editor",
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

    const result = createRecoverableStorage(storage).getItem("venn-editor");
    const recovered = JSON.parse(result as string);

    expect(recovered.state.diagram.metadata.name).toBe("Recuperable");
    expect(recovered.state.diagram.sets[0]).toMatchObject({
      id: "set-a",
      shape: "circle",
      radiusX: 160,
      radiusY: 160,
      rotation: 0,
      hidden: false,
    });
    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("ignores persisted fields that could replace store actions", () => {
    const storage = createTestStorage();
    const diagram = createInitialDiagram();

    storage.setItem(
      "venn-editor",
      JSON.stringify({
        version: 1,
        state: { diagram, resetDiagram: null, past: "invalid" },
      }),
    );

    const result = createRecoverableStorage(storage).getItem("venn-editor");

    expect(JSON.parse(result as string).state).toEqual({ diagram });
  });

  it("allows saving a replacement after recovery is resolved", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);

    storage.setItem("venn-editor", "{broken");
    recoverable.getItem("venn-editor");

    useStorageRecovery.getState().resolve();

    const replacement = JSON.stringify({
      version: 1,
      state: { diagram: createInitialDiagram() },
    });

    recoverable.setItem("venn-editor", replacement);

    expect(storage.getItem("venn-editor")).toBe(replacement);
  });

  it("allows explicitly deleting invalid data", () => {
    const storage = createTestStorage();
    const recoverable = createRecoverableStorage(storage);

    storage.setItem("venn-editor", "{broken");
    recoverable.getItem("venn-editor");
    recoverable.removeItem("venn-editor");

    expect(storage.getItem("venn-editor")).toBeNull();

    useStorageRecovery.getState().resolve();
    expect(useStorageRecovery.getState().issue).toBeNull();
  });

  it("does not report an error when no diagram is stored", () => {
    const storage = createTestStorage();

    expect(createRecoverableStorage(storage).getItem("venn-editor")).toBeNull();
    expect(useStorageRecovery.getState().issue).toBeNull();
  });
});
