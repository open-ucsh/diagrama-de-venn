import { useId } from "react";

import { getSetRadii, isEllipseSet, VENN_CANVAS_SIZE } from "@/domain/venn/geometry";

import type { VennDiagram, VennSet } from "@/domain/venn/models";

import { getVennRegions, type VennRegion } from "@/domain/venn/regions";

interface VennRegionFillProps {
  diagram: VennDiagram;
  selectedRegionIds: string[];
  hoveredRegionId?: string | null;
}

interface IntersectionShapeProps {
  sets: VennSet[];
  clipIdBySetId: Map<string, string>;
  index?: number;
}

interface ClipShapeProps {
  set: VennSet;
  fill?: string;
}

function ClipShape({ set, fill }: ClipShapeProps) {
  if (isEllipseSet(set)) {
    const { radiusX, radiusY } = getSetRadii(set);

    return (
      <ellipse
        cx={set.position.x}
        cy={set.position.y}
        fill={fill}
        rx={radiusX}
        ry={radiusY}
        transform={`rotate(${set.rotation ?? 0} ${set.position.x} ${set.position.y})`}
      />
    );
  }

  return <circle cx={set.position.x} cy={set.position.y} fill={fill} r={set.radius} />;
}

function IntersectionShape({ sets, clipIdBySetId, index = 0 }: IntersectionShapeProps) {
  const set = sets[index];

  if (!set) {
    return <rect fill="white" height={VENN_CANVAS_SIZE.height} width={VENN_CANVAS_SIZE.width} />;
  }

  const clipId = clipIdBySetId.get(set.id);

  if (!clipId) {
    return null;
  }

  return (
    <g clipPath={`url(#${clipId})`}>
      <IntersectionShape clipIdBySetId={clipIdBySetId} index={index + 1} sets={sets} />
    </g>
  );
}

function getRegionSets(diagram: VennDiagram, region: VennRegion) {
  const includedSetIds = new Set(region.setIds);

  return {
    includedSets: diagram.sets.filter((set) => includedSetIds.has(set.id)),

    excludedSets: diagram.sets.filter((set) => !includedSetIds.has(set.id)),
  };
}

export function VennRegionFill({
  diagram,
  selectedRegionIds,
  hoveredRegionId = null,
}: VennRegionFillProps) {
  const reactId = useId();

  const idPrefix = reactId.replace(/[^a-zA-Z0-9_-]/g, "");

  const regions = getVennRegions(diagram);

  const selectedIds = new Set(selectedRegionIds);

  const clipIdBySetId = new Map(
    diagram.sets.map((set, index) => [set.id, `${idPrefix}-venn-set-clip-${index}`]),
  );

  return (
    <g pointerEvents="none">
      <defs>
        {diagram.sets.map((set) => {
          const clipId = clipIdBySetId.get(set.id);

          if (!clipId) {
            return null;
          }

          return (
            <clipPath clipPathUnits="userSpaceOnUse" id={clipId} key={set.id}>
              <ClipShape set={set} />
            </clipPath>
          );
        })}

        {regions.map((region, regionIndex) => {
          const { includedSets, excludedSets } = getRegionSets(diagram, region);

          const maskId = `${idPrefix}-venn-region-mask-${regionIndex}`;

          return (
            <mask
              height={VENN_CANVAS_SIZE.height}
              id={maskId}
              key={region.id}
              maskUnits="userSpaceOnUse"
              width={VENN_CANVAS_SIZE.width}
              x="0"
              y="0"
            >
              <rect fill="black" height={VENN_CANVAS_SIZE.height} width={VENN_CANVAS_SIZE.width} />

              {includedSets.length === 0 ? (
                <rect
                  fill="white"
                  height={VENN_CANVAS_SIZE.height}
                  width={VENN_CANVAS_SIZE.width}
                />
              ) : (
                <IntersectionShape clipIdBySetId={clipIdBySetId} sets={includedSets} />
              )}

              {excludedSets.map((set) => (
                <ClipShape fill="black" key={set.id} set={set} />
              ))}
            </mask>
          );
        })}
      </defs>

      {regions.map((region, index) => {
        const isSelected = selectedIds.has(region.id);

        const isHovered = hoveredRegionId === region.id;

        const maskId = `${idPrefix}-venn-region-mask-${index}`;

        return (
          <g key={region.id}>
            <rect
              data-export-ignore
              className="fill-brand-primary transition-opacity duration-200 ease-out"
              height={VENN_CANVAS_SIZE.height}
              mask={`url(#${maskId})`}
              opacity={isSelected ? 0.32 : 0}
              width={VENN_CANVAS_SIZE.width}
            />

            <rect
              className="fill-brand-primary transition-opacity duration-100 ease-out"
              height={VENN_CANVAS_SIZE.height}
              mask={`url(#${maskId})`}
              opacity={isHovered ? 0.08 : 0}
              width={VENN_CANVAS_SIZE.width}
            />
          </g>
        );
      })}
    </g>
  );
}
