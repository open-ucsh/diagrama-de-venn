import { useState } from "react";

import { useStorageRecovery } from "@/state/venn-storage";
import { useVennStore } from "@/state/venn-store";

const messages = {
  "invalid-json": "El diagrama guardado contiene datos que no se pueden leer.",
  "unsupported-version": "El diagrama guardado pertenece a una versión incompatible.",
  "invalid-data": "El diagrama guardado contiene datos incompletos o inválidos.",
  unavailable: "No fue posible acceder al almacenamiento o guardar los cambios.",
};

export function StorageRecoveryNotice() {
  const issue = useStorageRecovery((state) => state.issue);
  const resolve = useStorageRecovery((state) => state.resolve);
  const [error, setError] = useState<string | null>(null);

  if (issue === null) {
    return null;
  }

  function startEmpty() {
    setError(null);
    resolve();

    useVennStore.setState({
      diagram: useVennStore.getInitialState().diagram,
      selection: null,
      selectedRegionIds: [],
      past: [],
      future: [],
    });

    useVennStore.getState().resetDiagram();
    useVennStore.setState({ past: [], future: [] });
  }

  function deleteInvalidState() {
    setError(null);

    try {
      useVennStore.persist.clearStorage();
    } catch {
      setError("No se pudo eliminar el estado guardado. Revisa los permisos del navegador.");
      return;
    }

    // Las escrituras siguen bloqueadas mientras se reinicia el editor.
    useVennStore.getState().resetDiagram();
    useVennStore.setState({ past: [], future: [] });
    resolve();
  }

  return (
    <section
      aria-labelledby="storage-recovery-title"
      className="shrink-0 border-b border-border bg-white px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div role="alert" className="max-w-xl">
          <h2 id="storage-recovery-title" className="text-sm font-medium text-text">
            No pudimos recuperar tu diagrama
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            {messages[issue]} El editor sigue disponible. El estado guardado se conserva hasta que
            elijas cómo continuar.
          </p>

          {error !== null && (
            <p className="mt-1 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startEmpty}
            className="rounded-lg bg-brand-primary px-3 py-2 text-sm text-white hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Empezar con un diagrama vacío
          </button>

          <button
            type="button"
            onClick={deleteInvalidState}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Eliminar estado guardado
          </button>
        </div>
      </div>
    </section>
  );
}
