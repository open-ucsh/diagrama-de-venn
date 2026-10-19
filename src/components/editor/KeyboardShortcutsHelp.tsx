import { Keyboard, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Platform = "windows" | "mac";
type ShortcutKey =
  | "modifier"
  | "shift"
  | "backspace"
  | "enter"
  | "space"
  | "escape"
  | "home"
  | "end"
  | "up"
  | "down"
  | "Z"
  | "/"
  | "1"
  | "2"
  | "3";

interface Shortcut {
  label: string;
  combinations: readonly (readonly ShortcutKey[])[];
}

interface ShortcutGroup {
  title: string;
  shortcuts: readonly Shortcut[];
}

const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: "Edición",
    shortcuts: [
      {
        label: "Deshacer",
        combinations: [["modifier", "Z"]],
      },
      {
        label: "Rehacer",
        combinations: [["modifier", "shift", "Z"]],
      },
      {
        label: "Enfocar fórmula",
        combinations: [["modifier", "/"]],
      },
      {
        label: "Limpiar fórmula",
        combinations: [["modifier", "shift", "backspace"]],
      },
    ],
  },
  {
    title: "Paneles",
    shortcuts: [
      {
        label: "Conjuntos",
        combinations: [["modifier", "shift", "1"]],
      },
      {
        label: "Regiones",
        combinations: [["modifier", "shift", "2"]],
      },
      {
        label: "Historial",
        combinations: [["modifier", "shift", "3"]],
      },
    ],
  },
  {
    title: "Navegación",
    shortcuts: [
      {
        label: "Recorrer regiones",
        combinations: [["up"], ["down"]],
      },
      {
        label: "Primera / última",
        combinations: [["home"], ["end"]],
      },
      {
        label: "Seleccionar región",
        combinations: [["enter"], ["space"]],
      },
      {
        label: "Cerrar regiones / historial",
        combinations: [["escape"]],
      },
    ],
  },
];

function getInitialPlatform(): Platform {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "mac" : "windows";
}

function getKeyPresentation(
  key: ShortcutKey,
  platform: Platform,
): { label: string; description: string } {
  switch (key) {
    case "modifier":
      return platform === "mac"
        ? { label: "⌘", description: "Command" }
        : { label: "Ctrl", description: "Control" };
    case "shift":
      return { label: "⇧", description: "Shift" };
    case "backspace":
      return { label: "⌫", description: "Retroceso" };
    case "enter":
      return { label: "↵", description: "Enter" };
    case "space":
      return { label: "Espacio", description: "Espacio" };
    case "escape":
      return { label: "Esc", description: "Escape" };
    case "home":
      return { label: "Inicio", description: "Inicio" };
    case "end":
      return { label: "Fin", description: "Fin" };
    case "up":
      return { label: "↑", description: "Flecha arriba" };
    case "down":
      return { label: "↓", description: "Flecha abajo" };
    default:
      return { label: key, description: key };
  }
}

function ShortcutKeys({
  combinations,
  platform,
}: {
  combinations: Shortcut["combinations"];
  platform: Platform;
}) {
  const description = combinations
    .map((combination) =>
      combination.map((key) => getKeyPresentation(key, platform).description).join(" + "),
    )
    .join(" o ");

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span className="sr-only">{description}</span>

      {combinations.map((combination, combinationIndex) => (
        <span aria-hidden="true" className="flex items-center gap-1" key={combination.join("-")}>
          {combinationIndex > 0 && <span className="px-0.5 text-xs text-text-muted">/</span>}

          {combination.map((key) => {
            const { label, description: keyDescription } = getKeyPresentation(key, platform);

            return (
              <kbd
                className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1.5 font-sans text-xs font-medium text-text"
                key={key}
                title={keyDescription}
              >
                {label}
              </kbd>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export function KeyboardShortcutsHelp() {
  const titleId = useId();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>(getInitialPlatform);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    function closeAndRestoreFocus(): void {
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      closeAndRestoreFocus();
    }

    function handlePointerDown(event: PointerEvent): void {
      const container = containerRef.current;

      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleFocusIn(event: FocusEvent): void {
      const container = containerRef.current;

      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen]);

  function closePanel(): void {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Atajos de teclado"
        className={[
          "grid size-9 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          isOpen
            ? "bg-surface-hover text-brand-primary"
            : "text-text-muted hover:bg-surface-hover hover:text-brand-primary",
        ].join(" ")}
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        title="Atajos de teclado"
        type="button"
      >
        <Keyboard aria-hidden="true" className="size-4.5" />
      </button>

      {isOpen && (
        <div
          aria-labelledby={titleId}
          className="fixed top-20 right-3 left-3 z-50 flex max-h-128 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-lg sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-3 sm:w-96"
          id={panelId}
          role="dialog"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <Keyboard aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />

              <h2 className="text-sm font-semibold text-brand-primary" id={titleId}>
                Atajos de teclado
              </h2>
            </div>

            <button
              aria-label="Cerrar ayuda de atajos"
              className="grid size-7 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={closePanel}
              ref={closeButtonRef}
              title="Cerrar (Escape)"
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </header>

          <div className="shrink-0 px-4 pb-3">
            <div
              aria-label="Sistema para mostrar los atajos"
              className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1"
              role="group"
            >
              <button
                aria-pressed={platform === "windows"}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                  platform === "windows"
                    ? "bg-surface-hover text-brand-primary"
                    : "text-text-muted hover:text-brand-primary",
                ].join(" ")}
                onClick={() => setPlatform("windows")}
                type="button"
              >
                Windows / Linux
              </button>

              <button
                aria-pressed={platform === "mac"}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                  platform === "mac"
                    ? "bg-surface-hover text-brand-primary"
                    : "text-text-muted hover:text-brand-primary",
                ].join(" ")}
                onClick={() => setPlatform("mac")}
                type="button"
              >
                macOS
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-4">
            {SHORTCUT_GROUPS.map((group, index) => (
              <section
                aria-label={group.title}
                className={["py-3", index > 0 ? "border-t border-border" : ""].join(" ")}
                key={group.title}
              >
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
                  {group.title}
                </h3>

                <dl className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      className="flex min-h-8 items-center justify-between gap-3"
                      key={shortcut.label}
                    >
                      <dt className="min-w-0 text-xs leading-5 text-text">{shortcut.label}</dt>

                      <dd className="shrink-0">
                        <ShortcutKeys combinations={shortcut.combinations} platform={platform} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <footer className="shrink-0 border-t border-border px-4 py-3">
            <p className="text-xs leading-5 text-text-muted">
              Los atajos globales se pausan mientras escribes.
            </p>
            <p className="text-xs leading-5 text-text-muted">
              La navegación funciona dentro de Regiones.
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
