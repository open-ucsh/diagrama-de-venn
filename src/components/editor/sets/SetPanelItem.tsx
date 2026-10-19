import { ChevronDown, Eye, EyeOff, Trash2 } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";

import { DefinitionEditor } from "@/components/editor/sets/DefinitionEditor";
import { formatElementLabels } from "@/domain/venn/elements";
import type { VennSet } from "@/domain/venn/models";

interface SetPanelItemProps {
  set: VennSet;
  index: number;
  color: string;
  elements: string[];
  isEditing: boolean;
  canRemoveSet: boolean;
  cancelEditing: () => void;
  saveDefinition: (name: string, elements: string) => void;
  setSetColor: (setId: string, color: string) => void;
  toggleSetVisibility: (setId: string) => void;
  startEditing: (set: VennSet) => void;
  handleRemoveSet: (set: VennSet) => void;
}

export function SetPanelItem({
  set,
  index,
  color,
  elements,
  isEditing,
  canRemoveSet,
  cancelEditing,
  saveDefinition,
  setSetColor,
  toggleSetVisibility,
  startEditing,
  handleRemoveSet,
}: SetPanelItemProps) {
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const preview = formatElementLabels(elements);

  useLayoutEffect(() => {
    if (wasEditing.current && !isEditing) {
      triggerRef.current?.focus();
    }

    wasEditing.current = isEditing;
  }, [isEditing]);

  return (
    <article className={["venn-set-item", isEditing ? "venn-set-item--open" : ""].join(" ")}>
      <div className="venn-set-row">
        <label className="venn-set-color" style={{ color }} title={`Cambiar color de ${set.name}`}>
          <span aria-hidden="true" className="size-3 rounded-full bg-current" />

          <input
            aria-label={`Cambiar color del conjunto ${set.name}`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => setSetColor(set.id, event.currentTarget.value)}
            type="color"
            value={color}
          />
        </label>

        <button
          aria-controls={contentId}
          aria-expanded={isEditing}
          aria-label={`Editar conjunto ${set.name}, ${elements.length} elementos`}
          className="venn-set-trigger"
          onClick={() => {
            if (isEditing) {
              cancelEditing();
            } else {
              startEditing(set);
            }
          }}
          ref={triggerRef}
          type="button"
        >
          <span className={set.hidden ? "opacity-50" : ""}>{set.name}</span>

          <span className="ml-auto text-xs font-normal tabular-nums text-text-muted">
            {elements.length}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-text-muted transition-transform ${
              isEditing ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {!isEditing && (
        <p
          aria-label={`Elementos de ${set.name}: ${preview}`}
          className="venn-set-preview"
          title={`Conjunto ${index + 1}: ${preview}`}
        >
          {preview}
          {set.hidden ? " · oculto" : ""}
        </p>
      )}

      <div hidden={!isEditing} id={contentId}>
        {isEditing && (
          <>
            <DefinitionEditor
              initialElements={elements.join(", ")}
              initialName={set.name}
              onClose={cancelEditing}
              onSave={saveDefinition}
              title={`Editar conjunto ${set.name}`}
            />

            <div className="venn-set-secondary">
              <button
                aria-label={
                  set.hidden ? `Mostrar conjunto ${set.name}` : `Ocultar conjunto ${set.name}`
                }
                className="venn-text-action"
                onClick={() => toggleSetVisibility(set.id)}
                type="button"
              >
                {set.hidden ? (
                  <EyeOff aria-hidden="true" className="size-3.5" />
                ) : (
                  <Eye aria-hidden="true" className="size-3.5" />
                )}
                {set.hidden ? "Mostrar" : "Ocultar"}
              </button>

              <button
                aria-label={`Eliminar conjunto ${set.name}`}
                className="venn-text-action hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!canRemoveSet}
                onClick={() => handleRemoveSet(set)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
