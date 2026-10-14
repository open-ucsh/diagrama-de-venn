import { useId, useState, type FormEvent } from "react";

import { X } from "lucide-react";

interface DefinitionEditorProps {
  title: string;
  initialName?: string;
  initialElements: string;
  onSave: (name: string, elements: string) => void;
  onClose: () => void;
}

export function DefinitionEditor({
  title,
  initialName,
  initialElements,
  onSave,
  onClose,
}: DefinitionEditorProps) {
  const id = useId();
  const [name, setName] = useState(initialName ?? "");
  const [elements, setElements] = useState(initialElements);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      onSave(name, elements);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No fue posible guardar los elementos.",
      );
    }
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface/60 px-2.5 py-2 text-sm text-text outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10";

  return (
    <form
      aria-label={title}
      className="mt-2 rounded-lg border border-border bg-white p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onSubmit={handleSubmit}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-brand-primary">{title}</p>

        <button
          aria-label="Cancelar edición"
          className="grid size-6 place-items-center rounded text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-brand-primary"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      {initialName !== undefined && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-text" htmlFor={`${id}-name`}>
            Nombre
          </label>
          <input
            autoFocus
            autoComplete="off"
            className={inputClass}
            id={`${id}-name`}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            value={name}
          />
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-text" htmlFor={`${id}-elements`}>
        Elementos
      </label>

      <textarea
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={Boolean(error)}
        autoFocus={initialName === undefined}
        className={`${inputClass} resize-y font-mono`}
        id={`${id}-elements`}
        onChange={(event) => {
          setElements(event.target.value);
          setError(null);
        }}
        placeholder="1, 2, 3"
        rows={2}
        spellCheck={false}
        value={elements}
      />

      <p className="mt-1 text-xs leading-5 text-text-muted" id={`${id}-hint`}>
        Separa los elementos con comas. Deja vacío para guardar ∅.
      </p>

      {error && (
        <p className="mt-2 text-xs leading-5 text-red-700" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          className="rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand-primary"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>

        <button
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          type="submit"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
