import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import { addElement } from "@/domain/venn/operations";
import { consumeSharedProject, createShareUrl } from "@/services/venn/share-project";

describe("Shared Venn projects", () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
    window.history.replaceState({}, "", "/?keep=1#section=overview");
  });

  afterEach(() => {
    window.history.replaceState({}, "", originalUrl);
  });

  it("returns null when the URL has no shared project", () => {
    const before = window.location.href;

    expect(consumeSharedProject()).toBeNull();
    expect(window.location.href).toBe(before);
  });

  it("creates a link without modifying the current URL", () => {
    const before = window.location.href;
    const link = new URL(createShareUrl(createInitialDiagram(), []));

    expect(window.location.href).toBe(before);
    expect(link.searchParams.get("keep")).toBe("1");

    const hash = new URLSearchParams(link.hash.slice(1));
    expect(hash.get("section")).toBe("overview");
    expect(hash.has("venn")).toBe(true);
  });

  it("preserves names, colors, visibility, memberships and selected regions", () => {
    const initialDiagram = createInitialDiagram("Encuesta de estudiantes");
    const diagram = addElement(
      {
        ...initialDiagram,
        sets: initialDiagram.sets.map((set, index) => ({
          ...set,
          hidden: index === 1,
        })),
      },
      createVennElement("Martín", ["set-a", "set-b"]),
    );

    const selection = ["outside", "region:set-a:set-b"];
    window.history.replaceState({}, "", createShareUrl(diagram, selection));

    const project = consumeSharedProject();

    expect(project).not.toBeNull();
    if (!project) throw new Error("Expected a shared project.");

    expect(project.diagram.metadata.name).toBe(diagram.metadata.name);
    expect(
      project.diagram.sets.map(({ name, color, hidden }) => ({
        name,
        color,
        hidden,
      })),
    ).toEqual(
      diagram.sets.map(({ name, color, hidden }) => ({
        name,
        color,
        hidden,
      })),
    );

    expect(project.diagram.elements).toHaveLength(1);
    expect(project.diagram.elements[0]?.label).toBe("Martín");
    expect(project.diagram.elements[0]?.setIds).toEqual(project.diagram.sets.map((set) => set.id));

    const selectedMemberships = project.selectedRegionIds.map((regionId) =>
      regionId === "outside"
        ? []
        : project.diagram.sets
            .filter((set) => regionId.split(":").slice(1).includes(set.id))
            .map((set) => set.name),
    );

    expect(selectedMemberships).toEqual([[], ["A", "B"]]);
  });

  it("consumes the shared parameter once and preserves other URL parameters", () => {
    window.history.replaceState({}, "", createShareUrl(createInitialDiagram(), []));

    expect(consumeSharedProject()).not.toBeNull();

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));

    expect(hash.has("venn")).toBe(false);
    expect(hash.get("section")).toBe("overview");
    expect(url.searchParams.get("keep")).toBe("1");
    expect(consumeSharedProject()).toBeNull();
  });

  it("removes a malformed shared parameter even when parsing fails", () => {
    window.history.replaceState({}, "", "/?keep=1#section=overview&venn=%25");

    expect(() => consumeSharedProject()).toThrow();

    const hash = new URLSearchParams(window.location.hash.slice(1));
    expect(hash.has("venn")).toBe(false);
    expect(hash.get("section")).toBe("overview");
  });
});
