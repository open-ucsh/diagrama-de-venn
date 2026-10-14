import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

import { FormulaElements } from "@/components/editor/formula/FormulaElements";
import { replaceSetElements, replaceUniverseElements } from "@/domain/venn/elements";
import { createInitialDiagram } from "@/domain/venn/factories";
import { saveSetDefinition } from "@/state/venn-element-actions";
import { useVennStore } from "@/state/venn-store";

function mountResult(formula: string) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  function render(value: string) {
    act(() => {
      root.render(<FormulaElements formula={value} />);
    });
  }

  render(formula);

  return {
    render,
    text: () => (container.querySelector("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    completeResult: () => container.querySelector("details > p")?.textContent ?? "",
    dispose: () => {
      act(() => root.unmount());
      container.remove();
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

describe("Formula elements", () => {
  it("updates when the formula changes", () => {
    const view = mountResult("A ∩ B");

    try {
      expect(view.text()).toBe("Resultado: {3} · 1 elemento");

      view.render("A \\ B");

      expect(view.text()).toBe("Resultado: {1, 2} · 2 elementos");
    } finally {
      view.dispose();
    }
  });

  it("updates automatically when elements change", () => {
    const view = mountResult("A ∩ B");

    try {
      expect(view.text()).toBe("Resultado: {3} · 1 elemento");

      act(() => {
        saveSetDefinition("set-b", "B", "4");
      });

      expect(view.text()).toBe("Resultado: ∅ · 0 elementos");
    } finally {
      view.dispose();
    }
  });

  it("queries the complement within U", () => {
    const view = mountResult("(A ∪ B)'");

    try {
      expect(view.text()).toBe("Resultado: {5} · 1 elemento");
    } finally {
      view.dispose();
    }
  });

  it("hides the previous result for an invalid formula", () => {
    const view = mountResult("A ∩ B");

    try {
      expect(view.text()).toBe("Resultado: {3} · 1 elemento");

      view.render("A ∩");

      expect(view.text()).toBe("");
    } finally {
      view.dispose();
    }
  });

  it("updates from selected regions before the formula is ready", () => {
    const view = mountResult("");

    try {
      expect(view.text()).toBe("");

      act(() => {
        useVennStore.getState().setRegionSelection(["region:set-a:set-b"]);
      });

      expect(view.text()).toBe("Resultado: {3} · 1 elemento");

      act(() => {
        useVennStore.getState().clearRegionSelection();
      });

      expect(view.text()).toBe("");
    } finally {
      view.dispose();
    }
  });

  it("provides the complete result in the expandable content", () => {
    const view = mountResult("A ∪ B");

    try {
      expect(view.completeResult()).toBe("{1, 2, 3, 4}");
      expect(view.text()).toBe("Resultado: {1, 2, 3, 4} · 4 elementos");
    } finally {
      view.dispose();
    }
  });
});
