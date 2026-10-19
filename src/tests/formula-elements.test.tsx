import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

import { FormulaElements } from "@/components/editor/formula/FormulaElements";
import { replaceSetElements, replaceUniverseElements } from "@/domain/venn/elements";
import { createInitialDiagram } from "@/domain/venn/factories";
import { saveSetDefinition } from "@/state/venn-element-actions";
import { useVennStore } from "@/state/venn-store";

function montarResultado(formula: string) {
  const contenedor = document.createElement("div");
  document.body.append(contenedor);

  const raiz = createRoot(contenedor);

  function renderizar(valor: string): void {
    act(() => {
      raiz.render(<FormulaElements formula={valor} />);
    });
  }

  renderizar(formula);

  return {
    renderizar,

    resultado: () => contenedor.querySelector("summary")?.textContent?.trim() ?? "",

    cantidad: () =>
      contenedor
        .querySelector("[data-formula-elements] > span:last-child")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? "",

    resultadoCompleto: () => contenedor.querySelector("details > p")?.textContent?.trim() ?? "",

    estaVisible: () => contenedor.querySelector("[data-formula-elements]") !== null,

    desmontar: () => {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

beforeEach(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  let diagram = replaceSetElements(createInitialDiagram(), "set-a", "1, 2, 3");

  diagram = replaceSetElements(diagram, "set-b", "3, 4");
  diagram = replaceUniverseElements(diagram, "1, 2, 3, 4, 5");

  useVennStore.setState({
    diagram,
    selection: null,
    selectedRegionIds: [],
    past: [],
    future: [],
  });
});

describe("Elementos de la fórmula", () => {
  it("actualiza el resultado cuando cambia la fórmula", () => {
    const vista = montarResultado("A ∩ B");

    try {
      expect(vista.resultado()).toBe("{3}");
      expect(vista.cantidad()).toBe("1 elemento");

      vista.renderizar("A \\ B");

      expect(vista.resultado()).toBe("{1, 2}");
      expect(vista.cantidad()).toBe("2 elementos");
    } finally {
      vista.desmontar();
    }
  });

  it("actualiza el resultado cuando cambian los elementos", () => {
    const vista = montarResultado("A ∩ B");

    try {
      expect(vista.resultado()).toBe("{3}");
      expect(vista.cantidad()).toBe("1 elemento");

      act(() => {
        saveSetDefinition("set-b", "B", "4");
      });

      expect(vista.estaVisible()).toBe(true);
      expect(vista.resultado()).toBe("∅");
      expect(vista.cantidad()).toBe("0 elementos");
    } finally {
      vista.desmontar();
    }
  });

  it("calcula el complemento dentro del universo", () => {
    const vista = montarResultado("(A ∪ B)'");

    try {
      expect(vista.resultado()).toBe("{5}");
      expect(vista.cantidad()).toBe("1 elemento");
    } finally {
      vista.desmontar();
    }
  });

  it("oculta el resultado anterior cuando la fórmula es inválida", () => {
    const vista = montarResultado("A ∩ B");

    try {
      expect(vista.estaVisible()).toBe(true);
      expect(vista.resultado()).toBe("{3}");

      vista.renderizar("A ∩");

      expect(vista.estaVisible()).toBe(false);
      expect(vista.resultado()).toBe("");
      expect(vista.resultadoCompleto()).toBe("");
      expect(vista.cantidad()).toBe("");
    } finally {
      vista.desmontar();
    }
  });

  it("muestra las regiones seleccionadas antes de tener una fórmula", () => {
    const vista = montarResultado("");

    try {
      expect(vista.estaVisible()).toBe(false);

      act(() => {
        useVennStore.getState().setRegionSelection(["region:set-a:set-b"]);
      });

      expect(vista.estaVisible()).toBe(true);
      expect(vista.resultado()).toBe("{3}");
      expect(vista.cantidad()).toBe("1 elemento");

      act(() => {
        useVennStore.getState().clearRegionSelection();
      });

      expect(vista.estaVisible()).toBe(false);
    } finally {
      vista.desmontar();
    }
  });

  it("incluye el resultado completo en el contenido desplegable", () => {
    const vista = montarResultado("A ∪ B");

    try {
      expect(vista.resultado()).toBe("{1, 2, 3, 4}");
      expect(vista.resultadoCompleto()).toBe("{1, 2, 3, 4}");
      expect(vista.cantidad()).toBe("4 elementos");
    } finally {
      vista.desmontar();
    }
  });
});
