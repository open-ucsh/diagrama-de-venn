import { describe, expect, it } from "vitest";

import {
  formatElementLabels,
  getSelectedElements,
  getSetElements,
  parseElementLabels,
  replaceSetElements,
  replaceUniverseElements,
  updateSetDefinition,
} from "@/domain/venn/elements";
import { createInitialDiagram } from "@/domain/venn/factories";
import { getElementsInRegion } from "@/domain/venn/queries";
import { findVennRegion } from "@/domain/venn/regions";

describe("Element definitions", () => {
  it("accepts lists with or without braces and removes duplicates", () => {
    expect(parseElementLabels(" {1, 2, 2, Ana} ")).toEqual(["1", "2", "Ana"]);
    expect(parseElementLabels("1, 2")).toEqual(["1", "2"]);
    expect(parseElementLabels("{}")).toEqual([]);
    expect(parseElementLabels("")).toEqual([]);
  });

  it("rejects malformed lists", () => {
    expect(() => parseElementLabels("{1, 2")).toThrow();
    expect(() => parseElementLabels("1,,2")).toThrow();
    expect(() => parseElementLabels("1,")).toThrow();
    expect(() => parseElementLabels("{{1}}")).toThrow();
  });

  it("shares one element between sets", () => {
    const original = createInitialDiagram();
    const withA = replaceSetElements(original, "set-a", "1, 3");
    const diagram = replaceSetElements(withA, "set-b", "3, 5");

    expect(original.elements).toEqual([]);
    expect(diagram.elements).toHaveLength(3);
    expect(diagram.elements.find((element) => element.label === "3")).toMatchObject({
      setIds: ["set-a", "set-b"],
    });
  });

  it("preserves memberships in other sets when editing a list", () => {
    const withA = replaceSetElements(createInitialDiagram(), "set-a", "1, 3");
    const withB = replaceSetElements(withA, "set-b", "3");
    const diagram = replaceSetElements(withB, "set-a", "1");

    expect(diagram.elements.find((element) => element.label === "3")).toMatchObject({
      setIds: ["set-b"],
    });
  });

  it("keeps removed set members in the universe", () => {
    const initial = replaceSetElements(createInitialDiagram(), "set-a", "1");
    const diagram = replaceSetElements(initial, "set-a", "");

    expect(diagram.elements[0]).toMatchObject({
      label: "1",
      setIds: [],
    });
    expect(getSetElements(diagram, "set-a")).toEqual([]);
  });

  it("preserves element identity and returns the same diagram for no changes", () => {
    const diagram = replaceSetElements(createInitialDiagram(), "set-a", "1, 2");

    expect(replaceSetElements(diagram, "set-a", "2, 1")).toBe(diagram);
  });

  it("updates the name and elements without mutating the original", () => {
    const original = createInitialDiagram();
    const diagram = updateSetDefinition(original, "set-a", "Estudiantes", "Ana, Bruno");

    expect(original.sets[0]?.name).toBe("A");
    expect(original.elements).toEqual([]);
    expect(diagram.sets[0]?.name).toBe("Estudiantes");
    expect(getSetElements(diagram, "set-a")).toHaveLength(2);
  });

  it("adds universe elements outside all sets", () => {
    const withA = replaceSetElements(createInitialDiagram(), "set-a", "1");
    const diagram = replaceUniverseElements(withA, "1, 7");
    const outside = findVennRegion(diagram, "outside")!;

    expect(getElementsInRegion(diagram, outside).map((element) => element.label)).toEqual(["7"]);
  });

  it("rejects a universe that excludes a set member", () => {
    const diagram = replaceSetElements(createInitialDiagram(), "set-a", "1");

    expect(() => replaceUniverseElements(diagram, "7")).toThrow("U debe incluir");
    expect(diagram.elements[0]?.label).toBe("1");
  });

  it("removes universe elements that have no memberships", () => {
    const diagram = replaceUniverseElements(createInitialDiagram(), "1, 7");
    const updated = replaceUniverseElements(diagram, "1");

    expect(updated.elements.map((element) => element.label)).toEqual(["1"]);
  });

  it("queries exact regions and updates results after editing elements", () => {
    const withA = replaceSetElements(createInitialDiagram(), "set-a", "1, 3");
    const diagram = replaceSetElements(withA, "set-b", "3, 5");
    const intersectionId = "region:set-a:set-b";

    expect(getSelectedElements(diagram, [intersectionId]).map((element) => element.label)).toEqual([
      "3",
    ]);

    const updated = replaceSetElements(diagram, "set-b", "5");

    expect(getSelectedElements(updated, [intersectionId])).toEqual([]);
  });

  it("updates results when the selected regions change", () => {
    const withA = replaceSetElements(createInitialDiagram(), "set-a", "1, 3");
    const diagram = replaceSetElements(withA, "set-b", "3, 5");

    expect(
      getSelectedElements(diagram, ["region:set-a", "region:set-a:set-b"]).map(
        (element) => element.label,
      ),
    ).toEqual(["1", "3"]);

    expect(getSelectedElements(diagram, ["region:set-b"]).map((element) => element.label)).toEqual([
      "5",
    ]);
  });

  it("represents empty lists with the empty set symbol", () => {
    expect(formatElementLabels([])).toBe("∅");
    expect(formatElementLabels(["3", "4"])).toBe("{3, 4}");
  });
});
