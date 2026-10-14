import { Circle, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import { formatElementLabels } from "@/domain/venn/elements";
import type { VennSet } from "@/domain/venn/models";
import { MIN_SETS } from "@/domain/venn/operations";

import { DefinitionEditor } from "./DefinitionEditor";

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
  const preview = formatElementLabels(elements);
  const actionClass =
    "venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

  return (
    <article className="venn-sets-panel__item py-3">
      <div
        className={[
          "venn-sets-panel__item-content flex min-h-14 items-center gap-3",
          set.hidden ? "opacity-60" : "",
        ].join(" ")}
      >
        <label
          className="venn-sets-panel__color-control relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors hover:brightness-95"
          style={{
            backgroundColor: `${color}14`,
            borderColor: `${color}40`,
            color,
          }}
          title={`Cambiar color de ${set.name}`}
        >
          <Circle aria-hidden="true" className="size-4.5" />
          <input
            aria-label={`Cambiar color del conjunto ${set.name}`}
            className="absolute inset-0 cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onChange={(event) => setSetColor(set.id, event.target.value)}
            type="color"
            value={color}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text">{set.name}</p>
          <p
            aria-label={`Elementos de ${set.name}: ${preview}`}
            className="mt-0.5 truncate text-xs text-text-muted"
            title={`Conjunto ${index + 1}: ${preview}${set.hidden ? " · oculto" : ""}`}
          >
            {preview}
            {set.hidden ? " · oculto" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            aria-label={
              set.hidden ? `Mostrar conjunto ${set.name}` : `Ocultar conjunto ${set.name}`
            }
            className={actionClass}
            onClick={() => toggleSetVisibility(set.id)}
            title={set.hidden ? "Mostrar conjunto" : "Ocultar temporalmente"}
            type="button"
          >
            {set.hidden ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>

          <button
            aria-expanded={isEditing}
            aria-label={`Editar conjunto ${set.name}`}
            className={`${actionClass}${isEditing ? " bg-surface-hover text-brand-primary" : ""}`}
            onClick={() => {
              if (isEditing) {
                cancelEditing();
              } else {
                startEditing(set);
              }
            }}
            title="Editar nombre y elementos"
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>

          <button
            aria-label={`Eliminar conjunto ${set.name}`}
            className={`${actionClass} hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30`}
            disabled={!canRemoveSet}
            onClick={() => handleRemoveSet(set)}
            title={
              canRemoveSet ? "Eliminar conjunto" : `Debe existir al menos ${MIN_SETS} conjunto`
            }
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <DefinitionEditor
          initialElements={elements.join(", ")}
          initialName={set.name}
          onClose={cancelEditing}
          onSave={saveDefinition}
          title={`Editar conjunto ${set.name}`}
        />
      )}
    </article>
  );
}
