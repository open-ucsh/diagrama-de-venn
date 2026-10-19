import { type ComponentProps, useEffect, useId, useRef, useState } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(initialName ?? "");
  const [elements, setElements] = useState(initialElements);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
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
  };

  return (
    <form
      aria-label={title}
      className="venn-definition"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {initialName !== undefined && (
        <div>
          <label className="venn-field-label" htmlFor={`${id}-name`}>
            Nombre
          </label>

          <input
            autoComplete="off"
            className="venn-field"
            id={`${id}-name`}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setError(null);
            }}
            required
            value={name}
          />
        </div>
      )}

      <div>
        <label className="venn-field-label" htmlFor={`${id}-elements`}>
          Elementos
        </label>

        <input
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className="venn-field font-mono"
          id={`${id}-elements`}
          onChange={(event) => {
            setElements(event.currentTarget.value);
            setError(null);
          }}
          placeholder="1, 2, 3"
          spellCheck={false}
          value={elements}
        />

        <p className="venn-field-hint" id={`${id}-hint`}>
          Separa con comas. Vacío representa ∅.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-700" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button className="venn-save-button" type="submit">
          Guardar
        </button>

        <button className="venn-cancel-button" onClick={onClose} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}
