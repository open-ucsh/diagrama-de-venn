import { useState } from "react";
import { Circle, MousePointer2, X } from "lucide-react";

import type { VennSet } from "@/domain/venn/models";
import { useVennStore } from "@/state/venn-store";

export function SelectionInspector() {
  const diagram = useVennStore((state) => state.diagram);
  const selection = useVennStore((state) => state.selection);

  if (selection?.kind !== "set") {
    return (
      <aside className="min-h-0 overflow-y-auto border-t border-border bg-white lg:border-t-0 lg:border-l">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Propiedades</p>
        </div>

        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl border border-border bg-surface text-brand-primary">
            <MousePointer2 className="size-9" />
          </div>

          <h1 className="mt-6 text-xl font-bold">Explora tu diagrama</h1>

          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Selecciona un conjunto en el lienzo para ver sus propiedades.
          </p>
        </div>
      </aside>
    );
  }

  const set = diagram.sets.find((currentSet) => currentSet.id === selection.id);

  if (!set) {
    return null;
  }

  return <SetInspector key={set.id} set={set} />;
}

function SetInspector({ set }: { set: VennSet }) {
  const renameSet = useVennStore((state) => state.renameSet);
  const [draftName, setDraftName] = useState(set.name);
  const [isEditingName, setIsEditingName] = useState(false);

  function saveName() {
    const name = draftName.trim();

    if (name && name !== set.name) {
      renameSet(set.id, name);
    }

    setIsEditingName(false);
  }

  function startEditing(clearName = false) {
    setDraftName(clearName ? "" : set.name);
    setIsEditingName(true);
  }

  function cancelEditing() {
    setDraftName(set.name);
    setIsEditingName(false);
  }

  return (
    <aside className="min-h-0 overflow-y-auto border-t border-border bg-white lg:border-t-0 lg:border-l">
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Propiedades</p>
      </div>

      <div className="px-6 py-7">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primary">
            <Circle className="size-7" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-primary">Conjunto</p>

            {isEditingName ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  aria-label="Nombre del conjunto"
                  autoFocus
                  className="h-12 min-w-0 flex-1 rounded-xl border-2 border-brand-primary/40 bg-white px-3 text-2xl font-bold tracking-tight outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
                  onBlur={saveName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveName();
                    }

                    if (event.key === "Escape") {
                      cancelEditing();
                    }
                  }}
                  value={draftName}
                />

                <button
                  aria-label="Borrar nombre"
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-brand-primary"
                  onClick={() => setDraftName("")}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  <X className="size-6" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <button
                  aria-label={`Renombrar conjunto ${set.name}`}
                  className="min-w-0 flex-1 truncate text-left text-3xl font-bold tracking-tight transition-colors hover:text-brand-primary-hover"
                  onClick={() => startEditing()}
                  type="button"
                >
                  {set.name}
                </button>

                <button
                  aria-label="Borrar nombre para editarlo"
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-brand-primary"
                  onClick={() => startEditing(true)}
                  type="button"
                >
                  <X className="size-6" />
                </button>
              </div>
            )}
          </div>
        </div>

        <dl className="mt-8 space-y-5 border-t border-border pt-6 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">Radio</dt>
            <dd className="font-semibold">{set.radius}px</dd>
          </div>

          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">Posición</dt>
            <dd className="font-semibold">
              {Math.round(set.position.x)}, {Math.round(set.position.y)}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
