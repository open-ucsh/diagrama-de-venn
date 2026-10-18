import { type MouseEvent, useId, useMemo, useState } from "react";

import {
  getSetLabelPosition,
  getUniverseBounds,
  isPointInsideUniverse,
} from "@/components/canvas/canvas-geometry";
import { RegionTooltip } from "@/components/canvas/RegionTooltip";
import { SetShape } from "@/components/canvas/SetShape";
import { VennRegionFill } from "@/components/canvas/VennRegionFill";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { Point, VennSet } from "@/domain/venn/models";
import {
  getRegionAtPoint,
  getRegionLabel,
  getVennRegions,
  type VennRegion,
} from "@/domain/venn/regions";
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
    // Un SVG sin una transformación invertible no permite ubicar el puntero.
    return null;
  }
}

function getRegionFormula(sets: readonly VennSet[], region: VennRegion): string {
  const includedIds = new Set(region.setIds);

  return sets.map((set) => (includedIds.has(set.id) ? set.name : `${set.name}ᶜ`)).join(" ∩ ");
}

export function VennCanvas() {
  const descriptionId = useId();

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const toggleRegionSelection = useVennStore((state) => state.toggleRegionSelection);

  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  const universeBounds = useMemo(() => getUniverseBounds(diagram.sets), [diagram.sets]);

  const regions = useMemo(
    () =>
      getVennRegions(diagram).map((region) => ({
        ...region,
        label: getRegionLabel(diagram, region),
        formula: getRegionFormula(diagram.sets, region),
      })),
    [diagram.sets],
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
  const hoveredRegion = regions.find((region) => region.id === hoveredRegionId);
  const selectedRegionCount = selectedRegionIds.length;

  function getEventRegion(event: MouseEvent<SVGSVGElement>): VennRegion | null {
    const point = getCanvasPoint(event);

    if (!point || !isPointInsideUniverse(point, universeBounds)) {
      return null;
    }

    return getRegionAtPoint(diagram, point);
  }

  function handleCanvasClick(event: MouseEvent<SVGSVGElement>): void {
    const region = getEventRegion(event);

    if (region) {
      toggleRegionSelection(region.id);
    }
  }

  function handleCanvasMouseMove(event: MouseEvent<SVGSVGElement>): void {
    const region = getEventRegion(event);

    setHoveredRegionId(region?.id ?? null);
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
        onMouseLeave={() => setHoveredRegionId(null)}
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

        {hoveredRegion?.formula && (
          <RegionTooltip bounds={universeBounds} formula={hoveredRegion.formula} />
        )}
      </svg>

      <p className="sr-only" id={descriptionId}>
        Selecciona regiones haciendo clic en el diagrama. También puedes usar la lista accesible de
        regiones que aparece después del gráfico.
      </p>

      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {selectedRegionCount > 0
          ? `${selectedRegionCount} ${
              selectedRegionCount === 1 ? "región seleccionada" : "regiones seleccionadas"
            }.`
          : "No hay regiones seleccionadas."}
      </div>

      <details className="venn-region-picker">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
          Regiones
        </summary>

        <div aria-label="Regiones del diagrama">
          <p className="mt-2 text-xs text-text-muted">
            Selecciona una o más regiones para incluirlas en la fórmula.
          </p>

          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {regions.map((region) => {
              const selected = selectedIds.has(region.id);

              return (
                <li className="flex items-center gap-2 text-xs" key={region.id}>
                  <button
                    aria-pressed={selected}
                    className="rounded px-1 py-1 text-left text-brand-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    onClick={() => toggleRegionSelection(region.id)}
                    type="button"
                  >
                    {selected ? `Quitar ${region.label}` : `Seleccionar ${region.label}`}
                  </button>

                  <span className="font-mono text-text-muted">{region.formula}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </>
  );
}
