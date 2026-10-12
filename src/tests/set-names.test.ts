import { beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { addSet, renameSet } from "@/domain/venn/operations";
import { useVennStore } from "@/state/venn-store";

describe("Set name validation", () => {
  it.each(["A", "a", " A ", "\t a \n"])("rejects creating a duplicate named %j", (name) => {
    const diagram = createInitialDiagram();
    const set = createVennSet(name, { x: 450, y: 420 });

    expect(() => addSet(diagram, set)).toThrow(
      'Ya existe un conjunto llamado "A". Elige otro nombre',
    );
    expect(diagram.sets.map((current) => current.name)).toEqual(["A", "B"]);
  });

  it.each(["B", "b", " B ", "\t b \n"])(
    "rejects renaming a set to %j when another set uses that name",
    (name) => {
      const diagram = createInitialDiagram();

      expect(() => renameSet(diagram, "set-a", name)).toThrow(
        'Ya existe un conjunto llamado "B". Elige otro nombre',
      );
      expect(diagram.sets[0]?.name).toBe("A");
    },
  );

  it("ignores repeated spaces between words when creating a set", () => {
    const diagram = renameSet(createInitialDiagram(), "set-a", "Grupo Uno");

    expect(() => addSet(diagram, createVennSet("  grupo   UNO  ", { x: 450, y: 420 }))).toThrow(
      'Ya existe un conjunto llamado "Grupo Uno"',
    );
  });

  it("ignores repeated spaces between words when renaming a set", () => {
    const diagram = renameSet(createInitialDiagram(), "set-a", "Grupo Uno");

    expect(() => renameSet(diagram, "set-b", " grupo \t UNO ")).toThrow(
      'Ya existe un conjunto llamado "Grupo Uno"',
    );
  });

  it("checks existing names even when they contain unnecessary spaces", () => {
    const initialDiagram = createInitialDiagram();
    const diagram = {
      ...initialDiagram,
      sets: initialDiagram.sets.map((set) =>
        set.id === "set-a" ? { ...set, name: "  Grupo   Uno  " } : set,
      ),
    };

    expect(() => renameSet(diagram, "set-b", "grupo uno")).toThrow("Ya existe un conjunto");
  });

  it.each(["", " ", "\t\n"])("rejects an empty name %j when creating or renaming a set", (name) => {
    const diagram = createInitialDiagram();

    expect(() => addSet(diagram, createVennSet(name, { x: 450, y: 420 }))).toThrow(
      "El nombre del conjunto no puede estar vacío",
    );

    expect(() => renameSet(diagram, "set-a", name)).toThrow(
      "El nombre del conjunto no puede estar vacío",
    );
  });

  it("creates a valid set and normalizes unnecessary spaces", () => {
    const diagram = createInitialDiagram();
    const set = createVennSet("  Grupo   Tres  ", { x: 450, y: 420 });

    const updatedDiagram = addSet(diagram, set);

    expect(updatedDiagram.sets.at(-1)?.name).toBe("Grupo Tres");
    expect(set.name).toBe("  Grupo   Tres  ");
    expect(diagram.sets).toHaveLength(2);
  });

  it("renames a set to a valid name and preserves the original diagram", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "  Grupo   Uno  ");

    expect(updatedDiagram.sets[0]?.name).toBe("Grupo Uno");
    expect(diagram.sets[0]?.name).toBe("A");
  });

  it("allows changing the capitalization of the same set", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "a");

    expect(updatedDiagram.sets[0]?.name).toBe("a");
  });

  it("returns the original diagram when the normalized name is unchanged", () => {
    const diagram = createInitialDiagram();

    expect(renameSet(diagram, "set-a", " A ")).toBe(diagram);
  });

  it("includes hidden sets when checking duplicate names", () => {
    const initialDiagram = createInitialDiagram();
    const diagram = {
      ...initialDiagram,
      sets: initialDiagram.sets.map((set) => (set.id === "set-b" ? { ...set, hidden: true } : set)),
    };

    expect(() => renameSet(diagram, "set-a", "b")).toThrow('Ya existe un conjunto llamado "B"');
  });
});

describe("Set name validation through the store", () => {
  beforeEach(() => {
    useVennStore.getState().resetDiagram();
    useVennStore.setState({ past: [], future: [] });
  });

  it("preserves the complete state when creating a duplicate", () => {
    useVennStore.getState().setRegionSelection(["example-region"]);
    useVennStore.getState().undo();

    const before = useVennStore.getState();

    expect(() => before.createSet(" a ", { x: 450, y: 420 })).toThrow("Ya existe un conjunto");

    expect(useVennStore.getState()).toBe(before);
  });

  it("preserves the complete state when renaming to a duplicate", () => {
    useVennStore.getState().setRegionSelection(["example-region"]);
    useVennStore.getState().undo();

    const before = useVennStore.getState();

    expect(() => before.renameSet("set-a", " b ")).toThrow("Ya existe un conjunto");

    expect(useVennStore.getState()).toBe(before);
  });

  it("creates a valid normalized name with undo and redo support", () => {
    useVennStore.getState().createSet("  Grupo   Tres  ", { x: 450, y: 420 });

    expect(useVennStore.getState().diagram.sets.at(-1)?.name).toBe("Grupo Tres");

    useVennStore.getState().undo();
    expect(useVennStore.getState().diagram.sets).toHaveLength(2);

    useVennStore.getState().redo();
    expect(useVennStore.getState().diagram.sets.at(-1)?.name).toBe("Grupo Tres");
  });

  it("renames to a valid normalized name with undo and redo support", () => {
    useVennStore.getState().renameSet("set-a", "  Grupo   Uno  ");

    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("Grupo Uno");

    useVennStore.getState().undo();
    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("A");

    useVennStore.getState().redo();
    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("Grupo Uno");
  });
});
