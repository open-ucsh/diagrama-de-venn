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
    <div className="venn-formula-result" data-formula-elements>
      <span className="shrink-0 text-xs text-text-muted">Resultado</span>

      <details className="venn-result-details">
        <summary
          className="cursor-pointer truncate rounded font-mono text-sm focus-visible:outline-2 focus-visible:outline-brand-primary"
          title="Ver resultado completo"
        >
          {result}
        </summary>

        <p className="venn-result-expanded">{result}</p>
      </details>

      <span className="shrink-0 text-xs tabular-nums text-text-muted">
        {elements.length} {elements.length === 1 ? "elemento" : "elementos"}
      </span>
    </div>
  );
}
