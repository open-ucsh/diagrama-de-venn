import { type ReactNode, useId, useMemo } from "react";

import type { UniverseBounds } from "@/components/canvas/canvas-geometry";
import { SetShape } from "@/components/canvas/SetShape";
import { VENN_CANVAS_SIZE } from "@/domain/venn/geometry";
import type { VennDiagram, VennSet } from "@/domain/venn/models";
import { getVennRegions } from "@/domain/venn/regions";

interface VennRegionFillProps {
  diagram: VennDiagram;
  selectedRegionIds: string[];
  hoveredRegionId?: string | null;
  universeBounds: UniverseBounds;
}

interface IntersectionShapeProps {
  sets: readonly VennSet[];
  clipIdBySetId: ReadonlyMap<string, string>;
}

function IntersectionShape({ sets, clipIdBySetId }: IntersectionShapeProps) {
  let shape: ReactNode = (
    <rect fill="white" height={VENN_CANVAS_SIZE.height} width={VENN_CANVAS_SIZE.width} />
  );

  for (const set of [...sets].reverse()) {
    const clipId = clipIdBySetId.get(set.id);

    if (!clipId) {
      return null;
    }

    shape = <g clipPath={`url(#${clipId})`}>{shape}</g>;
  }

  return <>{shape}</>;
}

export function VennRegionFill({
  diagram,
  selectedRegionIds,
  hoveredRegionId = null,
  universeBounds,
}: VennRegionFillProps) {
  const reactId = useId();
  const idPrefix = `venn-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const universeClipId = `${idPrefix}-universe-clip`;

  const clips = useMemo(
    () =>
      diagram.sets.map((set, index) => ({
        set,
        id: `${idPrefix}-set-clip-${index}`,
      })),
    [diagram.sets, idPrefix],
  );

  const clipIdBySetId = useMemo(() => new Map(clips.map(({ set, id }) => [set.id, id])), [clips]);

  const regions = useMemo(
    () =>
      getVennRegions(diagram).map((region, index) => {
        const includedIds = new Set(region.setIds);
        const includedSets: VennSet[] = [];
        const excludedSets: VennSet[] = [];

        for (const set of diagram.sets) {
          if (includedIds.has(set.id)) {
            includedSets.push(set);
          } else {
            excludedSets.push(set);
          }
        }

        return {
          id: region.id,
          maskId: `${idPrefix}-region-mask-${index}`,
          includedSets,
          excludedSets,
        };
      }),
    [diagram.sets, idPrefix],
  );

  const selectedIds = new Set(selectedRegionIds);

  return (
    <g pointerEvents="none">
      <defs>
        <clipPath clipPathUnits="userSpaceOnUse" id={universeClipId}>
          <rect
            height={universeBounds.height}
            width={universeBounds.width}
            x={universeBounds.x}
            y={universeBounds.y}
          />
        </clipPath>

        {clips.map(({ set, id }) => (
          <clipPath clipPathUnits="userSpaceOnUse" id={id} key={set.id}>
            <SetShape set={set} />
          </clipPath>
        ))}

        {regions.map(({ id, maskId, includedSets, excludedSets }) => (
          <mask
            height={VENN_CANVAS_SIZE.height}
            id={maskId}
            key={id}
            maskContentUnits="userSpaceOnUse"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={VENN_CANVAS_SIZE.width}
            x={0}
            y={0}
          >
            <rect fill="black" height={VENN_CANVAS_SIZE.height} width={VENN_CANVAS_SIZE.width} />

            <IntersectionShape clipIdBySetId={clipIdBySetId} sets={includedSets} />

            {excludedSets.map((set) => (
              <SetShape fill="black" key={set.id} set={set} />
            ))}
          </mask>
        ))}
      </defs>

      <g clipPath={`url(#${universeClipId})`}>
        {regions.map(({ id, maskId }) => (
          <g key={id}>
            <rect
              className="fill-brand-primary transition-opacity duration-200 ease-out"
              height={VENN_CANVAS_SIZE.height}
              mask={`url(#${maskId})`}
              opacity={selectedIds.has(id) ? 0.32 : 0}
              width={VENN_CANVAS_SIZE.width}
            />

            <rect
              className="fill-brand-primary transition-opacity duration-100 ease-out"
              data-export-ignore
              height={VENN_CANVAS_SIZE.height}
              mask={`url(#${maskId})`}
              opacity={hoveredRegionId === id ? 0.08 : 0}
              width={VENN_CANVAS_SIZE.width}
            />
          </g>
        ))}
      </g>
    </g>
  );
}
