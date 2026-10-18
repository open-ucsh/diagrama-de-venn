import { useId, useState } from "react";

import { createInitialDiagram } from "@/domain/venn/factories";
import { useStorageRecovery } from "@/state/venn-storage";
import { useVennStore } from "@/state/venn-store";

const RECOVERY_MESSAGES = {
  "invalid-json": "El diagrama guardado contiene datos que no se pueden leer.",
  "unsupported-version": "El diagrama guardado pertenece a una versión incompatible.",
  "invalid-data": "El diagrama guardado contiene datos incompletos o inválidos.",
  unavailable: "No fue posible acceder al almacenamiento o guardar los cambios.",
};

function resetEditor(): void {
  useVennStore.setState({
    diagram: createInitialDiagram(),
    selection: null,
    selectedRegionIds: [],
    past: [],
    future: [],
  });
}

export function StorageRecoveryNotice() {
  const titleId = useId();
  const issue = useStorageRecovery((state) => state.issue);
  const resolve = useStorageRecovery((state) => state.resolve);
  const [error, setError] = useState<string | null>(null);

  if (issue === null) {
    return null;
  }

  function startEmpty(): void {
    setError(null);
    resolve();
    resetEditor();
  }

  async function deleteInvalidState(): Promise<void> {
    setError(null);

    try {
      await useVennStore.persist.clearStorage();

      // Reinicia mientras las escrituras siguen bloqueadas para no recrear
      // inmediatamente el estado que el usuario acaba de eliminar.
      resetEditor();
      resolve();
    } catch {
      setError("No se pudo eliminar el estado guardado. Revisa los permisos del navegador.");
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="shrink-0 border-b border-border bg-white px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl" role="alert">
          <h2 className="text-sm font-medium text-text" id={titleId}>
            No pudimos recuperar tu diagrama
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            {RECOVERY_MESSAGES[issue]} El editor sigue disponible. El estado guardado se conserva
            hasta que elijas cómo continuar.
          </p>

          {error !== null && (
            <p className="mt-1 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-3 py-2 text-sm text-white hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={startEmpty}
            type="button"
          >
            Empezar con un diagrama vacío
          </button>

          <button
            className="rounded-lg border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={() => void deleteInvalidState()}
            type="button"
          >
            Eliminar estado guardado
          </button>
        </div>
      </div>
    </section>
  );
}
