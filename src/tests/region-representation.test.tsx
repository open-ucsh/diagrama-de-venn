import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RegionTooltip } from "@/components/canvas/RegionTooltip";

const LIMITES = {
  x: 24,
  y: 24,
  width: 700,
  height: 500,
};

interface OpcionesTooltip {
  fueraDelUniverso?: boolean;
  fueraDeLosConjuntos?: boolean;
}

function obtenerTooltip(
  elementos: string[],
  { fueraDelUniverso = false, fueraDeLosConjuntos = false }: OpcionesTooltip = {},
) {
  const contenedor = document.createElement("div");

  contenedor.innerHTML = renderToStaticMarkup(
    <svg>
      <RegionTooltip
        bounds={LIMITES}
        elements={elementos}
        formula="A ∩ B"
        outsideSets={fueraDeLosConjuntos}
        outsideUniverse={fueraDelUniverso}
      />
    </svg>,
  );

  const tooltip = contenedor.querySelector("[data-region-tooltip]");

  if (!tooltip) {
    throw new Error("No se representó el tooltip.");
  }

  const parrafos = tooltip.querySelectorAll("p");

  return {
    titulo: parrafos[0]?.textContent?.trim() ?? "",
    contenido: parrafos[1]?.textContent?.trim() ?? "",
  };
}

describe("Información de las regiones", () => {
  it("muestra la fórmula, los elementos y su cantidad", () => {
    const tooltip = obtenerTooltip(["3", "4"]);

    expect(tooltip.titulo).toBe("A ∩ B");
    expect(tooltip.contenido).toBe("{3, 4} · 2 elementos");
  });

  it("representa una región vacía con el símbolo de conjunto vacío", () => {
    const tooltip = obtenerTooltip([]);

    expect(tooltip.titulo).toBe("A ∩ B");
    expect(tooltip.contenido).toBe("∅ · 0 elementos");
  });

  it("distingue el exterior de los conjuntos del exterior del universo", () => {
    const fueraDeConjuntos = obtenerTooltip(["5"], {
      fueraDeLosConjuntos: true,
    });

    const fueraDeUniverso = obtenerTooltip([], {
      fueraDelUniverso: true,
    });

    expect(fueraDeConjuntos.titulo).toBe("Fuera de los conjuntos");
    expect(fueraDeConjuntos.contenido).toBe("{5} · 1 elemento");

    expect(fueraDeUniverso.titulo).toBe("Fuera del universo U");
    expect(fueraDeUniverso.contenido).toBe("Este espacio no pertenece a U");
  });

  it("no representa el exterior del universo como un conjunto vacío", () => {
    const tooltip = obtenerTooltip([], {
      fueraDelUniverso: true,
    });

    expect(tooltip.titulo).toBe("Fuera del universo U");
    expect(tooltip.contenido).not.toContain("∅");
    expect(tooltip.contenido).not.toContain("0 elementos");
  });

  it.each([
    {
      elementos: ["3"],
      esperado: "{3} · 1 elemento",
    },
    {
      elementos: ["3", "4"],
      esperado: "{3, 4} · 2 elementos",
    },
    {
      elementos: [],
      esperado: "∅ · 0 elementos",
    },
  ])("representa correctamente el contenido $esperado", ({ elementos, esperado }) => {
    expect(obtenerTooltip(elementos).contenido).toBe(esperado);
  });
});
