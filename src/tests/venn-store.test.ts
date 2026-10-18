import { beforeEach, describe, expect, it } from "vitest";

import { useVennStore } from "@/state/venn-store";

describe("Estado del editor de Venn", () => {
  beforeEach(() => {
    useVennStore.getState().resetDiagram();
    useVennStore.setState({ past: [], future: [] });
  });

  it("crea un tercer conjunto y lo selecciona", () => {
    useVennStore.getState().createSet("C", { x: 420, y: 450 });

    const state = useVennStore.getState();
    const createdSet = state.diagram.sets[2];

    expect(state.diagram.sets).toHaveLength(3);

    if (!createdSet) {
      throw new Error("No se creó el tercer conjunto.");
    }

    expect(createdSet.name).toBe("C");
    expect(createdSet.position).toEqual({ x: 420, y: 450 });
    expect(state.selection).toEqual({
      id: createdSet.id,
      kind: "set",
    });
  });

  it("crea un elemento y permite seleccionarlo", () => {
    useVennStore.getState().createElement("Martín", ["set-a"]);

    const { elements } = useVennStore.getState().diagram;
    const element = elements[0];

    expect(elements).toHaveLength(1);

    if (!element) {
      throw new Error("No se creó el elemento.");
    }

    expect(element.label).toBe("Martín");
    expect(element.setIds).toEqual(["set-a"]);

    useVennStore.getState().select({
      id: element.id,
      kind: "element",
    });

    expect(useVennStore.getState().selection).toEqual({
      id: element.id,
      kind: "element",
    });
  });

  it("limpia la selección al eliminar el elemento seleccionado", () => {
    useVennStore.getState().createElement("Martín", ["set-a"]);

    const element = useVennStore.getState().diagram.elements[0];

    if (!element) {
      throw new Error("No se creó el elemento.");
    }

    useVennStore.getState().select({
      id: element.id,
      kind: "element",
    });

    expect(useVennStore.getState().selection).toEqual({
      id: element.id,
      kind: "element",
    });

    useVennStore.getState().removeElement(element.id);

    const state = useVennStore.getState();

    expect(state.diagram.elements).toHaveLength(0);
    expect(state.selection).toBeNull();
  });
});
