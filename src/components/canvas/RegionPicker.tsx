import { type KeyboardEvent, useRef } from "react";

import { SHORTCUTS } from "@/components/editor/shortcuts/shortcuts";
import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";
import { formatElementLabels } from "@/domain/venn/elements";
import type { VennElement } from "@/domain/venn/models";
import type { VennRegion } from "@/domain/venn/regions";

interface RegionOption extends VennRegion {
  formula: string;
  elements: VennElement[];
}

interface RegionPickerProps {
  regions: readonly RegionOption[];
  selectedRegionIds: readonly string[];
  onToggle: (region: VennRegion) => void;
}

export function RegionPicker({ regions, selectedRegionIds, onToggle }: RegionPickerProps) {
  const regionsRef = useRef<HTMLDetailsElement>(null);
  const selectedIds = new Set(selectedRegionIds);

  useKeyboardShortcut({
    ...SHORTCUTS.toggleRegions,
    onTrigger: () => {
      const details = regionsRef.current;

      if (!details) {
        return;
      }

      details.open = !details.open;
      details.querySelector("summary")?.focus();
    },
  });

  function handleRegionsKeyDown(event: KeyboardEvent<HTMLDetailsElement>): void {
    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    const details = event.currentTarget;

    if (!details.open) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      details.open = false;
      details.querySelector("summary")?.focus();
      return;
    }

    const buttons = Array.from(details.querySelectorAll<HTMLButtonElement>("[data-region-option]"));

    if (buttons.length === 0) {
      return;
    }

    const currentIndex = buttons.findIndex((button) => button === event.target);
    let nextIndex: number;

    switch (event.key) {
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case "ArrowUp":
        nextIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttons[nextIndex]?.focus();
  }

  return (
    <details className="venn-region-picker" onKeyDown={handleRegionsKeyDown} ref={regionsRef}>
      <summary
        aria-keyshortcuts="Control+Shift+2 Meta+Shift+2"
        className="cursor-pointer text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        title="Mostrar u ocultar regiones (Ctrl/Cmd + Shift + 2)"
      >
        Regiones
      </summary>

      <div aria-label="Regiones del diagrama">
        <p className="mt-2 text-xs text-text-muted">
          Usa ↑ y ↓ para recorrer, Inicio y Fin para saltar, y Enter o Espacio para seleccionar.
          Escape cierra el panel.
        </p>

        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {regions.map((region) => {
            const selected = selectedIds.has(region.id);
            const result = formatElementLabels(region.elements.map((element) => element.label));

            return (
              <li key={region.id}>
                <button
                  aria-pressed={selected}
                  className={[
                    "w-full rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                    selected ? "bg-surface-hover" : "",
                  ].join(" ")}
                  data-region-option
                  onClick={() => onToggle(region)}
                  type="button"
                >
                  <span className="block font-semibold text-brand-primary">
                    <span className="sr-only">{selected ? "Quitar " : "Seleccionar "}</span>
                    {region.formula}
                  </span>

                  <span className="mt-1 block wrap-break-words text-text">Elementos: {result}</span>

                  <span className="mt-1 block text-text-muted">
                    Cardinalidad: {region.elements.length}
                    {region.setIds.length === 0
                      ? " · Dentro de U, fuera de los conjuntos"
                      : region.elements.length === 0
                        ? " · Región vacía"
                        : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
