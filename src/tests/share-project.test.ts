import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createInitialDiagram, createVennElement } from "@/domain/venn/factories";
import { addElement } from "@/domain/venn/operations";
import { consumeSharedProject, createShareUrl } from "@/services/venn/share-project";

describe("Proyectos de Venn compartidos", () => {
  let originalUrl: string;
  let originalHistoryState: unknown;

  beforeEach(() => {
    originalUrl = window.location.href;
    originalHistoryState = window.history.state;

    window.history.replaceState({}, "", "/?keep=1#section=overview");
  });

  afterEach(() => {
    window.history.replaceState(originalHistoryState, "", originalUrl);
  });

  it("devuelve null y conserva la URL cuando no hay un proyecto compartido", () => {
    const originalLocation = window.location.href;

    expect(consumeSharedProject()).toBeNull();
    expect(window.location.href).toBe(originalLocation);
  });

  it("crea un enlace sin modificar la URL actual y conserva sus parámetros", () => {
    const originalLocation = window.location.href;

    const url = new URL(createShareUrl(createInitialDiagram(), []));
    const hash = new URLSearchParams(url.hash.slice(1));

    expect(window.location.href).toBe(originalLocation);
    expect(url.searchParams.get("keep")).toBe("1");
    expect(hash.get("section")).toBe("overview");
    expect(hash.has("venn")).toBe(true);
  });

  it("conserva nombres, colores, visibilidad, pertenencias y regiones seleccionadas", () => {
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
    const selectedRegionIds = ["outside", "region:set-a:set-b"];

    window.history.replaceState({}, "", createShareUrl(diagram, selectedRegionIds));

    const project = consumeSharedProject();

    if (!project) {
      throw new Error("No se recuperó el proyecto compartido.");
    }

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

    expect(project.diagram.elements).toEqual([
      expect.objectContaining({
        label: "Martín",
        setIds: project.diagram.sets.map((set) => set.id),
      }),
    ]);

    const selectedMemberships = project.selectedRegionIds.map((regionId) => {
      if (regionId === "outside") {
        return [];
      }

      const setIds = regionId.split(":").slice(1);

      return project.diagram.sets.filter((set) => setIds.includes(set.id)).map((set) => set.name);
    });

    expect(selectedMemberships).toEqual([[], ["A", "B"]]);
  });

  it("consume el proyecto una sola vez y conserva los demás parámetros de la URL", () => {
    window.history.replaceState({}, "", createShareUrl(createInitialDiagram(), []));

    expect(consumeSharedProject()).not.toBeNull();

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));

    expect(hash.has("venn")).toBe(false);
    expect(hash.get("section")).toBe("overview");
    expect(url.searchParams.get("keep")).toBe("1");
    expect(consumeSharedProject()).toBeNull();
  });

  it("elimina el parámetro compartido malformado aunque falle su lectura", () => {
    window.history.replaceState({}, "", "/?keep=1#section=overview&venn=%25");

    expect(() => consumeSharedProject()).toThrow();

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));

    expect(hash.has("venn")).toBe(false);
    expect(hash.get("section")).toBe("overview");
    expect(url.searchParams.get("keep")).toBe("1");
    expect(consumeSharedProject()).toBeNull();
  });
});
