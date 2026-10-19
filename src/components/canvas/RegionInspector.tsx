import { X } from "lucide-react";

interface RegionInspectorProps {
  formula: string;
  elements: string[];
  onClose: () => void;
}

export function RegionInspector({ formula, elements, onClose }: RegionInspectorProps) {
  return (
    <aside aria-label="Región seleccionada" className="venn-region-inspector" data-export-ignore>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-primary">Región seleccionada</h2>

        <button
          aria-label="Cerrar detalle de la región"
          className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-surface-hover"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <p className="venn-region-formula">{formula}</p>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs text-text-muted">Elementos</p>

        {elements.length > 0 ? (
          <ul aria-label="Elementos de la región" className="venn-element-chips">
            {elements.map((element) => (
              <li className="venn-element-chip" key={element}>
                {element}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">∅ · Región vacía</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-text-muted">Cardinalidad</span>
        <span className="font-semibold tabular-nums">{elements.length}</span>
      </div>
    </aside>
  );
}
