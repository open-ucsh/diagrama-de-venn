import { beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram, createVennSet } from "@/domain/venn/factories";
import { addSet, renameSet } from "@/domain/venn/operations";
import { useVennStore } from "@/state/venn-store";

describe("Validación de nombres de conjuntos", () => {
  it.each(["A", "a", " A ", "\t a \n"])(
    "rechaza crear un conjunto con el nombre duplicado %j",
    (name) => {
      const diagram = createInitialDiagram();
      const set = createVennSet(name, { x: 450, y: 420 });

      expect(() => addSet(diagram, set)).toThrow(
        'Ya existe un conjunto llamado "A". Elige otro nombre',
      );
      expect(diagram.sets.map((current) => current.name)).toEqual(["A", "B"]);
    },
  );

  it.each(["B", "b", " B ", "\t b \n"])(
    "rechaza renombrar un conjunto con el nombre duplicado %j",
    (name) => {
      const diagram = createInitialDiagram();

      expect(() => renameSet(diagram, "set-a", name)).toThrow(
        'Ya existe un conjunto llamado "B". Elige otro nombre',
      );
      expect(diagram.sets[0]?.name).toBe("A");
    },
  );

  it("ignora los espacios repetidos al comprobar duplicados durante la creación", () => {
    const diagram = renameSet(createInitialDiagram(), "set-a", "Grupo Uno");
    const set = createVennSet("  grupo   UNO  ", { x: 450, y: 420 });

    expect(() => addSet(diagram, set)).toThrow('Ya existe un conjunto llamado "Grupo Uno"');
  });

  it("ignora los espacios repetidos al comprobar duplicados durante el cambio de nombre", () => {
    const diagram = renameSet(createInitialDiagram(), "set-a", "Grupo Uno");

    expect(() => renameSet(diagram, "set-b", " grupo \t UNO ")).toThrow(
      'Ya existe un conjunto llamado "Grupo Uno"',
    );
  });

  it("detecta duplicados aunque el nombre existente tenga espacios innecesarios", () => {
    const initialDiagram = createInitialDiagram();
    const diagram = {
      ...initialDiagram,
      sets: initialDiagram.sets.map((set) =>
        set.id === "set-a" ? { ...set, name: "  Grupo   Uno  " } : set,
      ),
    };

    expect(() => renameSet(diagram, "set-b", "grupo uno")).toThrow("Ya existe un conjunto");
  });

  it.each(["", " ", "\t\n"])("rechaza el nombre vacío %j al crear un conjunto", (name) => {
    const diagram = createInitialDiagram();

    expect(() => addSet(diagram, createVennSet(name, { x: 450, y: 420 }))).toThrow(
      "El nombre del conjunto no puede estar vacío",
    );
  });

  it.each(["", " ", "\t\n"])("rechaza el nombre vacío %j al renombrar un conjunto", (name) => {
    const diagram = createInitialDiagram();

    expect(() => renameSet(diagram, "set-a", name)).toThrow(
      "El nombre del conjunto no puede estar vacío",
    );
  });

  it("normaliza el nombre de un conjunto nuevo sin modificar los datos originales", () => {
    const diagram = createInitialDiagram();
    const set = createVennSet("  Grupo   Tres  ", { x: 450, y: 420 });

    const updatedDiagram = addSet(diagram, set);

    expect(updatedDiagram.sets.at(-1)?.name).toBe("Grupo Tres");
    expect(set.name).toBe("  Grupo   Tres  ");
    expect(diagram.sets).toHaveLength(2);
  });

  it("normaliza un nuevo nombre sin modificar el diagrama original", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "  Grupo   Uno  ");

    expect(updatedDiagram.sets[0]?.name).toBe("Grupo Uno");
    expect(diagram.sets[0]?.name).toBe("A");
  });

  it("permite cambiar las mayúsculas y minúsculas del mismo conjunto", () => {
    const diagram = createInitialDiagram();

    const updatedDiagram = renameSet(diagram, "set-a", "a");

    expect(updatedDiagram.sets[0]?.name).toBe("a");
  });

  it("devuelve el mismo diagrama cuando el nombre normalizado no cambia", () => {
    const diagram = createInitialDiagram();

    expect(renameSet(diagram, "set-a", " A ")).toBe(diagram);
  });

  it("incluye los conjuntos ocultos al comprobar nombres duplicados", () => {
    const initialDiagram = createInitialDiagram();
    const diagram = {
      ...initialDiagram,
      sets: initialDiagram.sets.map((set) => (set.id === "set-b" ? { ...set, hidden: true } : set)),
    };

    expect(() => renameSet(diagram, "set-a", "b")).toThrow('Ya existe un conjunto llamado "B"');
  });
});

describe("Validación de nombres desde el estado del editor", () => {
  beforeEach(() => {
    useVennStore.getState().resetDiagram();
    useVennStore.setState({ past: [], future: [] });
  });

  it("conserva el estado completo cuando se intenta crear un nombre duplicado", () => {
    useVennStore.getState().setRegionSelection(["example-region"]);
    useVennStore.getState().undo();

    const previousState = useVennStore.getState();

    expect(() => previousState.createSet(" a ", { x: 450, y: 420 })).toThrow(
      "Ya existe un conjunto",
    );
    expect(useVennStore.getState()).toBe(previousState);
  });

  it("conserva el estado completo cuando se intenta renombrar con un nombre duplicado", () => {
    useVennStore.getState().setRegionSelection(["example-region"]);
    useVennStore.getState().undo();

    const previousState = useVennStore.getState();

    expect(() => previousState.renameSet("set-a", " b ")).toThrow("Ya existe un conjunto");
    expect(useVennStore.getState()).toBe(previousState);
  });

  it("permite deshacer y rehacer la creación de un conjunto con nombre normalizado", () => {
    useVennStore.getState().createSet("  Grupo   Tres  ", { x: 450, y: 420 });

    expect(useVennStore.getState().diagram.sets).toHaveLength(3);
    expect(useVennStore.getState().diagram.sets.at(-1)?.name).toBe("Grupo Tres");

    useVennStore.getState().undo();

    expect(useVennStore.getState().diagram.sets).toHaveLength(2);

    useVennStore.getState().redo();

    expect(useVennStore.getState().diagram.sets).toHaveLength(3);
    expect(useVennStore.getState().diagram.sets.at(-1)?.name).toBe("Grupo Tres");
  });

  it("permite deshacer y rehacer un cambio de nombre normalizado", () => {
    useVennStore.getState().renameSet("set-a", "  Grupo   Uno  ");

    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("Grupo Uno");

    useVennStore.getState().undo();

    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("A");

    useVennStore.getState().redo();

    expect(useVennStore.getState().diagram.sets[0]?.name).toBe("Grupo Uno");
  });
});
