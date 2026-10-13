import { Check, Circle, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";

import type { VennSet } from "@/domain/venn/models";
import { MIN_SETS } from "@/domain/venn/operations";

interface SetPanelItemProps {
  set: VennSet;
  index: number;
  color: string;
  isEditing: boolean;
  draftName: string;
  nameError: string | null;
  canRemoveSet: boolean;
  setDraftName: (name: string) => void;
  setNameError: (error: string | null) => void;
  cancelEditing: () => void;
  saveName: (set: VennSet) => void;
  setSetColor: (setId: string, color: string) => void;
  toggleSetVisibility: (setId: string) => void;
  startEditing: (set: VennSet) => void;
  handleRemoveSet: (set: VennSet) => void;
}

export function SetPanelItem({
  set,
  index,
  color,
  isEditing,
  draftName,
  nameError,
  canRemoveSet,
  setDraftName,
  setNameError,
  cancelEditing,
  saveName,
  setSetColor,
  toggleSetVisibility,
  startEditing,
  handleRemoveSet,
}: SetPanelItemProps) {
  const errorId = `set-name-error-${set.id}`;

  return (
    <article className={["venn-sets-panel__item py-3", set.hidden ? "opacity-60" : ""].join(" ")}>
      {isEditing ? (
        <div>
          <div className="venn-sets-panel__item-content flex items-center gap-2">
            <span
              className="venn-sets-panel__color-control grid size-9 shrink-0 place-items-center rounded-md border"
              style={{
                backgroundColor: `${color}14`,
                borderColor: `${color}40`,
                color,
              }}
            >
              <Circle aria-hidden="true" className="size-4.5" />
            </span>

            <input
              aria-describedby={nameError ? errorId : undefined}
              aria-invalid={Boolean(nameError)}
              aria-label={`Nuevo nombre para ${set.name}`}
              autoFocus
              className={[
                "h-9 min-w-0 flex-1 border-b bg-transparent px-1 text-sm font-semibold text-text outline-none focus:border-b-2",
                nameError ? "border-red-600" : "border-brand-primary",
              ].join(" ")}
              onChange={(event) => {
                setDraftName(event.target.value);
                setNameError(null);
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;

                if (event.key === "Enter") {
                  event.preventDefault();
                  saveName(set);
                }

                if (event.key === "Escape") {
                  cancelEditing();
                }
              }}
              value={draftName}
            />

            <button
              aria-label="Cancelar edición"
              className="venn-sets-panel__action grid size-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={cancelEditing}
              title="Cancelar"
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>

            <button
              aria-label="Guardar nombre"
              className="venn-sets-panel__action grid size-8 shrink-0 place-items-center bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={() => saveName(set)}
              title="Guardar nombre"
              type="button"
            >
              <Check aria-hidden="true" className="size-4" />
            </button>
          </div>

          {nameError && (
            <p className="mt-2 text-xs leading-5 text-red-700" id={errorId} role="alert">
              {nameError}
            </p>
          )}
        </div>
      ) : (
        <div className="venn-sets-panel__item-content flex min-h-14 items-center gap-3">
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
              onChange={(event) => {
                setSetColor(set.id, event.target.value);
              }}
              type="color"
              value={color}
            />
          </label>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">{set.name}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Conjunto {index + 1}
              {set.hidden ? " · oculto" : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label={
                set.hidden ? `Mostrar conjunto ${set.name}` : `Ocultar conjunto ${set.name}`
              }
              className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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
              aria-label={`Renombrar conjunto ${set.name}`}
              className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={() => startEditing(set)}
              title="Renombrar conjunto"
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>

            <button
              aria-label={`Eliminar conjunto ${set.name}`}
              className="venn-sets-panel__action grid size-8 place-items-center text-text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-30"
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
      )}
    </article>
  );
}
