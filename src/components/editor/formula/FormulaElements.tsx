import { formatElementLabels, getSelectedElements } from "@/domain/venn/elements";
import { parseVennExpression } from "@/domain/venn/expressions";
import { useVennStore } from "@/state/venn-store";

interface FormulaElementsProps {
  formula: string;
}

export function FormulaElements({ formula }: FormulaElementsProps) {
  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);

  let regionIds = selectedRegionIds;

  if (formula.trim()) {
    try {
      regionIds = parseVennExpression(diagram, formula).regionIds;
    } catch {
      return null;
    }
  } else if (regionIds.length === 0) {
    return null;
  }

  const elements = getSelectedElements(diagram, regionIds);
  const result = formatElementLabels(elements.map((element) => element.label));

  return (
    <details className="mt-1 text-xs text-brand-primary" data-formula-elements>
      <summary className="flex cursor-pointer list-none items-baseline gap-1.5 rounded py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
        <span className="shrink-0 font-semibold">Resultado:</span>{" "}
        <span className="min-w-0 flex-1 truncate font-mono" title={result}>
          {result}
        </span>{" "}
        <span className="shrink-0 text-text-muted">
          · {elements.length} {elements.length === 1 ? "elemento" : "elementos"}
        </span>
      </summary>

      <p className="max-h-24 overflow-y-auto wrap-break-words rounded-md bg-surface px-2.5 py-2 font-mono leading-5">
        {result}
      </p>
    </details>
  );
}
