import { useDeferredValue, useEffect, useMemo } from "react";

import { Sigma, X } from "lucide-react";

import { getSelectedRegionsExpression, prepareDiagramExpressions } from "@/domain/venn/expressions";

import { useVennStore } from "@/state/venn-store";

export function FormulaBar() {
  const diagram = useVennStore((state) => state.diagram);

  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);

  const clearRegionSelection = useVennStore((state) => state.clearRegionSelection);

  const deferredRegionIds = useDeferredValue(selectedRegionIds);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      prepareDiagramExpressions(diagram);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [diagram]);

  const expression = useMemo(
    () => getSelectedRegionsExpression(diagram, deferredRegionIds),
    [diagram, deferredRegionIds],
  );

  return (
    <section
      aria-label="Fórmula de la selección"
      className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-sm"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <Sigma aria-hidden="true" className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Fórmula seleccionada
        </p>

        {expression ? (
          <p className="mt-1 overflow-x-auto font-mono text-lg font-bold text-ink">{expression}</p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            Selecciona una o más regiones del diagrama.
          </p>
        )}
      </div>

      {selectedRegionIds.length > 0 && (
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-text-muted transition-colors hover:bg-surface hover:text-ink"
          onClick={clearRegionSelection}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
          Limpiar
        </button>
      )}
    </section>
  );
}
