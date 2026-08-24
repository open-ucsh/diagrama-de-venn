import { beforeEach, describe, expect, it } from "vitest";

import { useVennStore } from "../state/venn-store";

describe("Venn store", () => {
  beforeEach(() => {
    useVennStore.getState().resetDiagram();
  });

  it("creates a third set through the store", () => {
    useVennStore.getState().createSet("C", { x: 420, y: 450 });

    expect(useVennStore.getState().diagram.sets).toHaveLength(3);
    expect(useVennStore.getState().diagram.sets[2]?.name).toBe("C");
  });

  it("creates and selects an element", () => {
    useVennStore.getState().createElement("Martín", ["set-a"]);
    const element = useVennStore.getState().diagram.elements[0]!;

    useVennStore.getState().select({
      id: element.id,
      kind: "element",
    });

    expect(useVennStore.getState().selection).toEqual({
      id: element.id,
      kind: "element",
    });
  });

  it("clears the selection when the selected element is removed", () => {
    useVennStore.getState().createElement("Martín", ["set-a"]);
    const element = useVennStore.getState().diagram.elements[0]!;

    useVennStore.getState().select({
      id: element.id,
      kind: "element",
    });
    useVennStore.getState().removeElement(element.id);

    expect(useVennStore.getState().selection).toBeNull();
  });
});
