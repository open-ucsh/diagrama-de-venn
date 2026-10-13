import { useState, type MouseEvent } from "react";

import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";
import {
  getRegionAtPoint,
  getRegionLabel,
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
  const includedSetIds = new Set(region.setIds);

  return sets.map((set) => (includedSetIds.has(set.id) ? set.name : `${set.name}ᶜ`)).join(" ∩ ");
}

export function VennCanvas() {
  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);
  const [hoveredRegion, setHoveredRegion] = useState<VennRegion | null>(null);

  const universeBounds = getUniverseBounds(diagram.sets);

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) return;

    const region = getRegionAtPoint(diagram, point);
    toggleRegionSelection(region.id);
  }

  function handleCanvasMouseMove(event: MouseEvent<SVGSVGElement>) {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) {
      setHoveredRegion(null);
      return;
    }

    const region = getRegionAtPoint(diagram, point);

    setHoveredRegion((currentRegion) => (currentRegion?.id === region.id ? currentRegion : region));
  }

  const hoveredFormula =
    hoveredRegion === null ? null : getRegionFormula(diagram.sets, hoveredRegion);
  const regions = getVennRegions(diagram);

  return (
    <>
      <svg
        aria-describedby="venn-canvas-description"
        aria-label="Diagrama de Venn"
        className="block h-auto w-full max-w-full touch-manipulation select-none lg:h-full lg:w-auto"
        data-venn-canvas
        height={VENN_CANVAS_SIZE.height}
        onClick={handleCanvasClick}
        onMouseLeave={() => setHoveredRegion(null)}
        onMouseMove={handleCanvasMouseMove}
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

        {hoveredFormula && <RegionTooltip bounds={universeBounds} formula={hoveredFormula} />}
      </svg>

      <p className="sr-only" id="venn-canvas-description">
        Selecciona regiones haciendo clic en el diagrama. También puedes usar la lista accesible de
        regiones que aparece después del gráfico.
      </p>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedRegionIds.length > 0
          ? `${selectedRegionIds.length} ${
              selectedRegionIds.length === 1 ? "región seleccionada" : "regiones seleccionadas"
            }.`
          : "No hay regiones seleccionadas."}
      </div>

      <details className="mt-2 w-full max-w-xl rounded-md border border-border bg-white/95 p-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
          Consultar y seleccionar regiones
        </summary>
        <div aria-label="Regiones del diagrama">
          <p className="mt-2 text-xs text-text-muted">
            Selecciona una o más regiones para incluirlas en la fórmula.
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {regions.map((region) => {
              const label = getRegionLabel(diagram, region);
              const selected = selectedRegionIds.includes(region.id);

              return (
                <li className="flex items-center gap-2 text-xs" key={region.id}>
                  <button
                    aria-pressed={selected}
                    className="rounded px-1 py-1 text-left text-brand-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    onClick={() => toggleRegionSelection(region.id)}
                    type="button"
                  >
                    {selected ? `Quitar ${label}` : `Seleccionar ${label}`}
                  </button>
                  <span className="font-mono text-text-muted">
                    {getRegionFormula(diagram.sets, region)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </>
  );
}
