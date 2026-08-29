import type { VennDiagram, VennSet } from "@/domain/venn/models";

import { getVennRegions, type VennRegion } from "@/domain/venn/regions";

interface VennRegionFillProps {
  diagram: VennDiagram;
  selectedRegionIds: string[];
}

interface IntersectionShapeProps {
  sets: VennSet[];
  clipIdBySetId: Map<string, string>;
  index?: number;
}

function IntersectionShape({ sets, clipIdBySetId, index = 0 }: IntersectionShapeProps) {
  const set = sets[index];

  if (!set) {
    return <rect fill="white" height="600" width="900" />;
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

export function VennRegionFill({ diagram, selectedRegionIds }: VennRegionFillProps) {
  const regions = getVennRegions(diagram);

  const selectedIds = new Set(selectedRegionIds);

  const clipIdBySetId = new Map(
    diagram.sets.map((set, index) => [set.id, `venn-set-clip-${index}`]),
  );

  return (
    <g pointerEvents="none">
      <defs>
        {diagram.sets.map((set, index) => (
          <clipPath id={`venn-set-clip-${index}`} key={set.id}>
            <circle cx={set.position.x} cy={set.position.y} r={set.radius} />
          </clipPath>
        ))}

        {regions.map((region, regionIndex) => {
          const { includedSets, excludedSets } = getRegionSets(diagram, region);

          const maskId = `venn-region-mask-${regionIndex}`;

          return (
            <mask
              height="600"
              id={maskId}
              key={region.id}
              maskUnits="userSpaceOnUse"
              width="900"
              x="0"
              y="0"
            >
              <rect fill="black" height="600" width="900" />

              {includedSets.length === 0 ? (
                <rect fill="white" height="600" width="900" />
              ) : (
                <IntersectionShape clipIdBySetId={clipIdBySetId} sets={includedSets} />
              )}

              {excludedSets.map((set) => (
                <circle
                  cx={set.position.x}
                  cy={set.position.y}
                  fill="black"
                  key={set.id}
                  r={set.radius}
                />
              ))}
            </mask>
          );
        })}
      </defs>

      {regions.map((region, index) => {
        const isSelected = selectedIds.has(region.id);

        return (
          <rect
            className="fill-brand-primary transition-opacity duration-200 ease-out"
            height="600"
            key={region.id}
            mask={`url(#venn-region-mask-${index})`}
            opacity={isSelected ? 0.28 : 0}
            width="900"
          />
        );
      })}
    </g>
  );
}
