import { type MouseEvent, useId, useMemo, useState } from "react";

import {
  getSetLabelPosition,
  getUniverseBounds,
  isPointInsideUniverse,
} from "@/components/canvas/canvas-geometry";
import { RegionInspector } from "@/components/canvas/RegionInspector";
import { RegionTooltip } from "@/components/canvas/RegionTooltip";
import { SetShape } from "@/components/canvas/SetShape";
import { VennRegionFill } from "@/components/canvas/VennRegionFill";
import { formatElementLabels } from "@/domain/venn/elements";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";
import { getElementsInRegion } from "@/domain/venn/queries";
import { getRegionAtPoint, getVennRegions, type VennRegion } from "@/domain/venn/regions";
import { useVennStore } from "@/state/venn-store";

const DEFAULT_COLORS = ["#d9a21b", "#168d78", "#50a9bd", "#12376b"] as const;

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_COLORS[index] ?? DEFAULT_COLORS[0];
}

function getCanvasPoint(event: MouseEvent<SVGSVGElement>): Point | null {
  const svg = event.currentTarget;
  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  try {
    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformed = point.matrixTransform(matrix.inverse());

    if (!Number.isFinite(transformed.x) || !Number.isFinite(transformed.y)) {
      return null;
    }

    return {
      x: transformed.x,
      y: transformed.y,
    };
  } catch {
    return null;
  }
}

function getRegionFormula(sets: readonly VennSet[], region: VennRegion): string {
  if (sets.length === 0) {
    return "U";
  }

  const includedIds = new Set(region.setIds);

  return sets.map((set) => (includedIds.has(set.id) ? set.name : `${set.name}ᶜ`)).join(" ∩ ");
}

export function VennCanvas() {
  const descriptionId = useId();

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [inspectorClosed, setInspectorClosed] = useState(false);

  const universeBounds = useMemo(() => getUniverseBounds(diagram.sets), [diagram.sets]);

  const regions = useMemo(
    () =>
      getVennRegions(diagram).map((region) => ({
        ...region,
        formula: getRegionFormula(diagram.sets, region),
        elements: getElementsInRegion(diagram, region),
      })),
    [diagram],
  );

  const renderedSets = useMemo(
    () =>
      diagram.sets.map((set, index) => ({
        set,
        color: getSetColor(set, index),
        labelPosition: getSetLabelPosition(diagram.sets, index),
      })),
    [diagram.sets],
  );

  const selectedIds = new Set(selectedRegionIds);

  const outsideUniverse = hoverPoint !== null && !isPointInsideUniverse(hoverPoint, universeBounds);

  const hoveredRegion =
    hoverPoint !== null && !outsideUniverse ? getRegionAtPoint(diagram, hoverPoint) : null;

  const selectedId =
    lastSelectedId !== null && selectedIds.has(lastSelectedId)
      ? lastSelectedId
      : selectedRegionIds[selectedRegionIds.length - 1];

  const selectedRegion = regions.find((region) => region.id === selectedId);

  const activeRegion = outsideUniverse ? null : hoveredRegion;

  const activeElements = activeRegion ? getElementsInRegion(diagram, activeRegion) : [];

  const selectedRegionCount = selectedRegionIds.length;

  function toggleRegion(region: VennRegion): void {
    const wasSelected = selectedIds.has(region.id);

    toggleRegionSelection(region.id);
    setLastSelectedId(wasSelected ? null : region.id);
    setInspectorClosed(false);
  }

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>): void {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) {
      return;
    }

    const region = getRegionAtPoint(diagram, point);

    if (region) {
      toggleRegion(region);
    }
  }

  return (
    <>
      <svg
        aria-describedby={descriptionId}
        aria-label="Diagrama de Venn"
        className="block h-full w-full touch-manipulation select-none"
        data-venn-canvas
        height={VENN_CANVAS_SIZE.height}
        onClick={handleCanvasClick}
        onMouseLeave={() => setHoverPoint(null)}
        onMouseMove={(event) => setHoverPoint(getCanvasPoint(event))}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${VENN_CANVAS_SIZE.width} ${VENN_CANVAS_SIZE.height}`}
        width={VENN_CANVAS_SIZE.width}
      >
        <rect
          className="fill-transparent"
          height={VENN_CANVAS_SIZE.height}
          width={VENN_CANVAS_SIZE.width}
        />

        <rect
          className="venn-universe"
          data-universe-frame
          height={universeBounds.height}
          width={universeBounds.width}
          x={universeBounds.x}
          y={universeBounds.y}
        />

        <text className="venn-universe-label" x={universeBounds.x + 14} y={universeBounds.y + 25}>
          U
        </text>

        <g pointerEvents="none">
          {renderedSets.map(({ set, color }) => (
            <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
              <SetShape fill={color} fillOpacity={0.1} set={set} />
            </g>
          ))}
        </g>

        <VennRegionFill
          diagram={diagram}
          hoveredRegionId={hoveredRegion?.id ?? null}
          selectedRegionIds={selectedRegionIds}
          universeBounds={universeBounds}
        />

        <g pointerEvents="none">
          {renderedSets.map(({ set, color, labelPosition }) => (
            <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
              <SetShape fill="none" set={set} stroke={color} strokeWidth={3} />

              <text
                className="venn-set-label"
                dominantBaseline="middle"
                fill={color}
                fontSize={28}
                fontWeight={700}
                textAnchor="middle"
                x={labelPosition.x}
                y={labelPosition.y}
              >
                {set.name}
              </text>
            </g>
          ))}
        </g>

        {(activeRegion || outsideUniverse) && (
          <RegionTooltip
            bounds={universeBounds}
            elements={activeElements.map((element) => element.label)}
            formula={activeRegion ? getRegionFormula(diagram.sets, activeRegion) : ""}
            outsideSets={activeRegion?.setIds.length === 0}
            outsideUniverse={outsideUniverse}
          />
        )}
      </svg>

      <p className="sr-only" id={descriptionId}>
        Selecciona regiones haciendo clic en el diagrama. El tooltip muestra sus elementos y
        cardinalidad. La lista Regiones permite consultar los elementos y seleccionar usando el
        teclado.
      </p>

      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {selectedRegion
          ? `${selectedRegionCount} ${
              selectedRegionCount === 1 ? "región seleccionada" : "regiones seleccionadas"
            }. ${selectedRegion.formula}.
            Elementos: ${formatElementLabels(
              selectedRegion.elements.map((element) => element.label),
            )}.
            Cardinalidad: ${selectedRegion.elements.length}.`
          : "No hay regiones seleccionadas."}
      </div>

      {selectedRegion && !inspectorClosed && (
        <RegionInspector
          elements={selectedRegion.elements.map((element) => element.label)}
          formula={selectedRegion.formula}
          onClose={() => setInspectorClosed(true)}
        />
      )}

      <details className="venn-region-picker">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
          Regiones
        </summary>

        <div aria-label="Regiones del diagrama">
          <p className="mt-2 text-xs text-text-muted">
            Selecciona regiones para incluirlas en la fórmula.
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
                    onClick={() => toggleRegion(region)}
                    type="button"
                  >
                    <span className="block font-semibold text-brand-primary">
                      <span className="sr-only">{selected ? "Quitar " : "Seleccionar "}</span>
                      {region.formula}
                    </span>

                    <span className="mt-1 block wrap-break-words text-text">
                      Elementos: {result}
                    </span>

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
    </>
  );
}
