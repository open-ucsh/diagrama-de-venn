import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RegionTooltip } from "@/components/canvas/RegionTooltip";

const bounds = { x: 24, y: 24, width: 700, height: 500 };

function tooltipText(elements: string[], outsideUniverse = false, outsideSets = false): string {
  const markup = renderToStaticMarkup(
    <svg>
      <RegionTooltip
        bounds={bounds}
        elements={elements}
        formula="A ∩ B"
        outsideSets={outsideSets}
        outsideUniverse={outsideUniverse}
      />
    </svg>,
  );

  const container = document.createElement("div");
  container.innerHTML = markup;

  const tooltip = container.querySelector("[data-region-tooltip]");

  if (!tooltip) {
    throw new Error("No se representó el tooltip.");
  }

  return Array.from(tooltip.querySelectorAll("p"))
    .map((paragraph) => paragraph.textContent)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("Region tooltip representation", () => {
  it("shows elements and cardinality", () => {
    const text = tooltipText(["3", "4"]);

    expect(text).toContain("Elementos: {3, 4}");
    expect(text).toContain("Cardinalidad: 2");
  });

  it("represents an empty region", () => {
    const text = tooltipText([]);

    expect(text).toContain("Elementos: ∅");
    expect(text).toContain("Cardinalidad: 0");
    expect(text).toContain("Región vacía");
  });

  it("distinguishes outside the sets from outside U", () => {
    const text = tooltipText(["5"], false, true);

    expect(text).toContain("Dentro de U, fuera de los conjuntos");
    expect(text).toContain("Cardinalidad: 1");
  });

  it("does not show zero cardinality outside U", () => {
    const text = tooltipText([], true);

    expect(text).toContain("Fuera del universo U");
    expect(text).not.toContain("Cardinalidad");
    expect(text).not.toContain("Región vacía");
  });

  it("updates the represented information when elements change", () => {
    expect(tooltipText(["3"])).toContain("Cardinalidad: 1");
    expect(tooltipText(["3", "4"])).toContain("Cardinalidad: 2");
    expect(tooltipText([])).toContain("Región vacía");
  });
});
