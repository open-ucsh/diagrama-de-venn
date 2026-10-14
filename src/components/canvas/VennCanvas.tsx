import { useState, type MouseEvent } from "react";

import { formatElementLabels } from "@/domain/venn/elements";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";
import { getElementsInRegion } from "@/domain/venn/queries";
import {
  findVennRegion,
  getRegionAtPoint,
  getVennRegions,
  type VennRegion,
} from "@/domain/venn/regions";
import { useVennStore } from "@/state/venn-store";

import { getSetLabelPosition, getUniverseBounds, isPointInsideUniverse } from "./canvas-geometry";
import { RegionTooltip } from "./RegionTooltip";
import { SetShape } from "./SetShape";
import { VennRegionFill } from "./VennRegionFill";

const DEFAULT_COLORS = ["#d9a21b", "#168d78", "#50a9bd", "#12376b"] as const;

function getSetColor(set: VennSet, index: number): string {
  return set.color ?? DEFAULT_COLORS[index] ?? DEFAULT_COLORS[0];
}

function getCanvasPoint(event: MouseEvent<SVGSVGElement>): Point | null {
  const svg = event.currentTarget;
  const screenMatrix = svg.getScreenCTM();

  if (!screenMatrix) return null;

  const screenPoint = svg.createSVGPoint();
  screenPoint.x = event.clientX;
  screenPoint.y = event.clientY;

  const canvasPoint = screenPoint.matrixTransform(screenMatrix.inverse());

  return {
    x: canvasPoint.x,
    y: canvasPoint.y,
  };
}

function getRegionFormula(sets: VennSet[], region: VennRegion): string {
  if (sets.length === 0) return "U";

  const includedSetIds = new Set(region.setIds);

  return sets.map((set) => (includedSetIds.has(set.id) ? set.name : `${set.name}ᶜ`)).join(" ∩ ");
}

export function VennCanvas() {
  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const universeBounds = getUniverseBounds(diagram.sets);
  const regions = getVennRegions(diagram);

  const outsideUniverse = hoverPoint !== null && !isPointInsideUniverse(hoverPoint, universeBounds);

  const hoveredRegion =
    hoverPoint !== null && !outsideUniverse ? getRegionAtPoint(diagram, hoverPoint) : null;

  const selectedId =
    lastSelectedId && selectedRegionIds.includes(lastSelectedId)
      ? lastSelectedId
      : selectedRegionIds[selectedRegionIds.length - 1];

  const selectedRegion = selectedId ? findVennRegion(diagram, selectedId) : undefined;

  const activeRegion = outsideUniverse ? null : (hoveredRegion ?? selectedRegion ?? null);

  const activeElements = activeRegion ? getElementsInRegion(diagram, activeRegion) : [];

  function toggleRegion(region: VennRegion) {
    const wasSelected = selectedRegionIds.includes(region.id);

    toggleRegionSelection(region.id);
    setLastSelectedId(wasSelected ? null : region.id);
  }

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) return;

    toggleRegion(getRegionAtPoint(diagram, point));
  }

  return (
    <>
      <svg
        aria-describedby="venn-canvas-description"
        aria-label="Diagrama de Venn"
        className="block h-auto w-full max-w-full touch-manipulation select-none lg:h-full lg:w-auto"
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
          {diagram.sets.map((set, index) => (
            <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
              <SetShape fill={getSetColor(set, index)} fillOpacity={0.1} set={set} />
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
          {diagram.sets.map((set, index) => {
            const color = getSetColor(set, index);
            const labelPosition = getSetLabelPosition(diagram.sets, index);

            return (
              <g key={set.id} opacity={set.hidden ? 0.18 : 1}>
                <SetShape fill="none" set={set} stroke={color} strokeWidth={3} />

                <text
                  className="venn-set-label"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize="28"
                  fontWeight="700"
                  textAnchor="middle"
                  x={labelPosition.x}
                  y={labelPosition.y}
                >
                  {set.name}
                </text>
              </g>
            );
          })}
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

      <p className="sr-only" id="venn-canvas-description">
        Selecciona regiones haciendo clic en el diagrama. El tooltip muestra sus elementos y
        cardinalidad. La lista Regiones permite consultar todos los elementos y seleccionar usando
        el teclado.
      </p>

      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {selectedRegion
          ? `${getRegionFormula(diagram.sets, selectedRegion)}.
             Elementos: ${formatElementLabels(
               getElementsInRegion(diagram, selectedRegion).map((element) => element.label),
             )}.
             Cardinalidad: ${getElementsInRegion(diagram, selectedRegion).length}.`
          : "No hay regiones seleccionadas."}
      </div>

      <details className="absolute right-3 top-3 z-20 max-w-sm rounded-lg border border-border bg-white/95 p-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
          Regiones
        </summary>

        <div aria-label="Regiones del diagrama">
          <p className="mt-2 text-xs text-text-muted">
            Selecciona regiones para incluirlas en la fórmula.
          </p>

          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {regions.map((region) => {
              const formula = getRegionFormula(diagram.sets, region);
              const selected = selectedRegionIds.includes(region.id);
              const elements = getElementsInRegion(diagram, region);
              const result = formatElementLabels(elements.map((element) => element.label));

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
                    <span className="block font-semibold text-brand-primary">{formula}</span>

                    <span className="mt-1 block wrap-break-words text-text">
                      Elementos: {result}
                    </span>

                    <span className="mt-1 block text-text-muted">
                      Cardinalidad: {elements.length}
                      {region.setIds.length === 0
                        ? " · Dentro de U, fuera de los conjuntos"
                        : elements.length === 0
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
