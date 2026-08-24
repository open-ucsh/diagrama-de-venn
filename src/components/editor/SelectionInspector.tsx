import { Circle, MousePointer2 } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

export function SelectionInspector() {
  const diagram = useVennStore((state) => state.diagram);
  const selection = useVennStore((state) => state.selection);

  if (selection?.kind !== "set") {
    return (
      <aside className="border-t border-border bg-white lg:border-t-0 lg:border-l">
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

  return (
    <aside className="border-t border-border bg-white lg:border-t-0 lg:border-l">
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Propiedades</p>
      </div>

      <div className="px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-brand-primary bg-brand-primary/10 text-brand-primary">
            <Circle className="size-5" />
          </span>

          <div>
            <p className="text-sm text-text-muted">Conjunto seleccionado</p>
            <h1 className="text-xl font-bold">{set.name}</h1>
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
